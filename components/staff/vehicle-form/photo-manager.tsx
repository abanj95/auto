"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { deletePhoto, reorderPhotos } from "@/app/(staff)/admin/(app)/vehicles/actions";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { preparePhoto, uploadImage } from "@/components/staff/vehicle-form/photo-upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_PHOTOS } from "@/lib/validation/vehicle";

const CONCURRENCY = 3;

type PhotoState = "queued" | "processing" | "uploading" | "saving" | "done" | "error";

export type InitialPhoto = { id: string; src: string };

type Photo = {
  key: string; // Stable id for drag-and-drop.
  id: string | null; // vehicle_photos.id once saved.
  src: string; // Public URL, or a local preview URL while uploading.
  state: PhotoState;
  progress: number;
  error?: string;
  file?: File;
};

const ACTIVE: PhotoState[] = ["processing", "uploading", "saving"];

export function PhotoManager({
  vehicleId,
  initialPhotos,
  getVehicleId,
  onStatusChange,
}: {
  /** Null until the draft exists. */
  vehicleId: string | null;
  initialPhotos: InitialPhoto[];
  /** Returns the vehicle id, creating the draft first if needed. */
  getVehicleId: () => Promise<string>;
  onStatusChange: (status: { saved: number; busy: boolean }) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(() =>
    initialPhotos.map((p) => ({ key: p.id, id: p.id, src: p.src, state: "done", progress: 1 })),
  );
  const [toDelete, setToDelete] = useState<Photo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(new Set<string>());
  const vehicleIdRef = useRef(vehicleId);
  useEffect(() => {
    vehicleIdRef.current = vehicleId;
  }, [vehicleId]);
  const dndId = useId();

  const update = useCallback((key: string, patch: Partial<Photo>) => {
    setPhotos((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }, []);

  const saved = photos.filter((p) => p.state === "done").length;
  const busy = photos.some((p) => p.state === "queued" || ACTIVE.includes(p.state));
  useEffect(() => onStatusChange({ saved, busy }), [saved, busy, onStatusChange]);

  // ---- ordering

  const persistOrder = useCallback(async (list: Photo[]) => {
    const vehicleId = vehicleIdRef.current;
    const ids = list.filter((p) => p.state === "done" && p.id).map((p) => p.id!);
    if (!vehicleId || ids.length === 0) return;
    const result = await reorderPhotos(vehicleId, ids);
    if (!result.ok) toast.error(result.error);
  }, []);

  // When a batch of uploads finishes, save the on-screen order (uploads finish out of order).
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy) void persistOrder(photos);
    wasBusy.current = busy;
  }, [busy, photos, persistOrder]);

  // ---- upload queue (3 at a time)

  const run = useCallback(
    async (photo: Photo) => {
      try {
        const vehicleId = await getVehicleId();
        vehicleIdRef.current = vehicleId;
        update(photo.key, { state: "processing", progress: 0, error: undefined });
        const prepared = await preparePhoto(photo.file!);

        update(photo.key, { state: "uploading" });
        // The server checks, re-encodes, stores and records the photo.
        const saved = await uploadImage<{ id: string }>(
          { kind: "vehicle", vehicleId },
          prepared.blob,
          (fraction) =>
            update(
              photo.key,
              fraction >= 1 ? { state: "saving", progress: 1 } : { progress: fraction },
            ),
        );
        update(photo.key, { state: "done", id: saved.id, file: undefined });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed. Tap Retry.";
        update(photo.key, { state: "error", error: message });
      } finally {
        started.current.delete(photo.key);
      }
    },
    [getVehicleId, update],
  );

  useEffect(() => {
    const active = photos.filter(
      (p) => ACTIVE.includes(p.state) || started.current.has(p.key),
    ).length;
    const next = photos.filter((p) => p.state === "queued" && !started.current.has(p.key));
    for (const photo of next.slice(0, Math.max(0, CONCURRENCY - active))) {
      started.current.add(photo.key);
      void run(photo);
    }
  }, [photos, run]);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const images = [...files].filter((f) => f.type.startsWith("image/") || f.type === "");
    if (images.length > room) {
      toast.error(
        room > 0
          ? `You can add ${room} more photo${room === 1 ? "" : "s"} (max ${MAX_PHOTOS}).`
          : `A vehicle can have up to ${MAX_PHOTOS} photos.`,
      );
    }
    const added: Photo[] = images.slice(0, Math.max(0, room)).map((file) => ({
      key: crypto.randomUUID(),
      id: null,
      src: URL.createObjectURL(file),
      state: "queued",
      progress: 0,
      file,
    }));
    setPhotos((list) => [...list, ...added]);
  }

  async function remove(photo: Photo) {
    if (photo.id) {
      const result = await deletePhoto(photo.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Photo deleted.");
    }
    setPhotos((list) => list.filter((p) => p.key !== photo.key));
  }

  // ---- drag and drop (long-press on touch)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((p) => p.key === active.id);
    const to = photos.findIndex((p) => p.key === over.id);
    const next = arrayMove(photos, from, to);
    setPhotos(next);
    if (!busy) void persistOrder(next);
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Add photos"
        data-testid="photo-input"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ""; // Allow picking the same files again.
        }}
        suppressHydrationWarning // Chrome on iOS adds autofill attributes.
      />
      <Button
        type="button"
        size="lg"
        variant="outline"
        className="h-12 w-full border-dashed text-base sm:w-auto"
        onClick={() => inputRef.current?.click()}
        disabled={photos.length >= MAX_PHOTOS}
      >
        <ImagePlus aria-hidden /> Add photos
      </Button>

      {photos.length > 0 ? (
        <>
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={photos.map((p) => p.key)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {photos.map((photo, index) => (
                  <SortablePhoto
                    key={photo.key}
                    photo={photo}
                    isCover={index === 0}
                    onDelete={() => (photo.id ? setToDelete(photo) : void remove(photo))}
                    onRetry={() =>
                      update(photo.key, { state: "queued", progress: 0, error: undefined })
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <p className="text-sm text-muted-foreground">
            {photos.length} / {MAX_PHOTOS} photos. Press and hold a photo, then drag to reorder. The
            first photo is the cover.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add up to {MAX_PHOTOS} photos from your phone. Photos are resized and location data is
          removed before upload.
        </p>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this photo?"
        description="It will be removed from the listing."
        confirmLabel="Delete photo"
        onConfirm={() => {
          if (toDelete) void remove(toDelete);
          setToDelete(null);
        }}
      />
    </div>
  );
}

const STATE_LABEL: Partial<Record<PhotoState, string>> = {
  queued: "Waiting…",
  processing: "Preparing…",
  saving: "Saving…",
};

function SortablePhoto({
  photo,
  isCover,
  onDelete,
  onRetry,
}: {
  photo: Photo;
  isCover: boolean;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.key,
  });
  const inProgress = photo.state !== "done" && photo.state !== "error";

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        WebkitTouchCallout: "none",
      }}
      className={cn(
        "relative aspect-[4/3] touch-manipulation overflow-hidden rounded-lg bg-muted select-none",
        isDragging && "z-10 scale-105 shadow-xl ring-2 ring-primary",
      )}
      data-testid="photo-tile"
      data-state={photo.state}
      data-photo-id={photo.id ?? undefined}
      {...attributes}
      {...listeners}
      aria-label={`${isCover ? "Cover photo" : "Photo"}${inProgress ? ", uploading" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: previews */}
      <img
        src={photo.src}
        alt=""
        draggable={false}
        className={cn("size-full object-cover", inProgress && "opacity-60")}
      />

      {isCover && (
        <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow">
          Cover
        </span>
      )}

      <button
        type="button"
        onClick={onDelete}
        disabled={
          photo.state === "processing" || photo.state === "uploading" || photo.state === "saving"
        }
        className="absolute top-0 right-0 flex size-11 items-start justify-end p-1.5 disabled:opacity-0"
        aria-label="Delete photo"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-black/65 text-white">
          <X className="size-4" />
        </span>
      </button>

      {inProgress && (
        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5 text-[11px] font-medium text-white">
          {photo.state === "uploading"
            ? `Uploading ${Math.round(photo.progress * 100)}%`
            : STATE_LABEL[photo.state]}
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-[width]"
              style={{
                width: `${Math.round((photo.state === "uploading" ? photo.progress : photo.state === "saving" ? 1 : 0) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {photo.state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/70 p-2 text-center text-[11px] text-white">
          <p className="line-clamp-2">{photo.error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Retry
          </button>
        </div>
      )}
    </li>
  );
}
