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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
  deleteSlide,
  reorderSlides,
  setSlideActive,
} from "@/app/(staff)/admin/(app)/(admin-only)/homepage/actions";
import { HeroSlide } from "@/components/public/hero-slide";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { ScaledPreview } from "@/components/staff/homepage/scaled-preview";
import { SlideDialog } from "@/components/staff/homepage/slide-dialog";
import {
  slideImageWarning,
  type AdminSlide,
  type SlideStatus,
} from "@/components/staff/homepage/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Overlay, TextPosition } from "@/lib/validation/homepage";

const STATUS: Record<SlideStatus, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-100 text-emerald-800" },
  scheduled: { label: "Scheduled", className: "bg-sky-100 text-sky-800" },
  ended: { label: "Ended", className: "bg-muted text-muted-foreground" },
  hidden: { label: "Hidden", className: "bg-muted text-muted-foreground" },
};

export function SlidesSection({ slides, eyebrow }: { slides: AdminSlide[]; eyebrow: string }) {
  // Local copy for drag-and-drop; reset whenever the server sends new data.
  const [items, setItems] = useState(slides);
  const [prevSlides, setPrevSlides] = useState(slides);
  if (slides !== prevSlides) {
    setPrevSlides(slides);
    setItems(slides);
  }
  const [editing, setEditing] = useState<AdminSlide | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [toDelete, setToDelete] = useState<AdminSlide | null>(null);
  const dndId = useId();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((s) => s.id === active.id);
    const to = items.findIndex((s) => s.id === over.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    const result = await reorderSlides(next.map((s) => s.id));
    if (!result.ok) {
      toast.error(result.error);
      setItems(slides);
    }
  }

  async function toggle(slide: AdminSlide, active: boolean) {
    setItems((list) => list.map((s) => (s.id === slide.id ? { ...s, active } : s)));
    const result = await setSlideActive(slide.id, active);
    if (!result.ok) {
      toast.error(result.error);
      setItems(slides);
    }
  }

  async function remove(slide: AdminSlide) {
    const result = await deleteSlide(slide.id);
    if (result.ok) toast.success("Slide deleted.");
    else toast.error(result.error);
  }

  function openEditor(slide: AdminSlide | null) {
    setEditing(slide);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Hero slides</h2>
          <p className="text-sm text-muted-foreground">
            The big images at the top of the home page. Drag{" "}
            <GripVertical className="inline size-4 align-text-bottom" aria-label="handle" /> to
            change the order.
          </p>
        </div>
        <Button className="h-11" onClick={() => openEditor(null)}>
          <Plus aria-hidden /> Add slide
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No slides. The home page shows the dealership name on a plain background.
        </p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="grid gap-3 lg:grid-cols-2">
              {items.map((slide) => (
                <SlideRow
                  key={slide.id}
                  slide={slide}
                  eyebrow={eyebrow}
                  onEdit={() => openEditor(slide)}
                  onDelete={() => setToDelete(slide)}
                  onToggle={(active) => void toggle(slide, active)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <SlideDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slide={editing}
        eyebrow={eyebrow}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this slide?"
        description="It will be removed from the home page. This can't be undone."
        confirmLabel="Delete slide"
        onConfirm={() => {
          if (toDelete) void remove(toDelete);
          setToDelete(null);
        }}
      />
    </section>
  );
}

function SlideRow({
  slide,
  eyebrow,
  onEdit,
  onDelete,
  onToggle,
}: {
  slide: AdminSlide;
  eyebrow: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });
  // The switch updates `active` at once; recompute the badge from it.
  const status: SlideStatus = !slide.active
    ? "hidden"
    : slide.status === "hidden"
      ? "live"
      : slide.status;
  const warning = slideImageWarning(slide.image_width, slide.image_height);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        isDragging && "relative z-10 shadow-xl ring-2 ring-primary",
      )}
      data-testid="slide-row"
    >
      <ScaledPreview width={1280} height={600} className={cn(!slide.active && "opacity-50")}>
        <HeroSlide
          slide={{
            ...slide,
            text_position: slide.text_position as TextPosition,
            overlay_strength: slide.overlay_strength as Overlay,
          }}
          eyebrow={eyebrow}
          preview
          loading="lazy"
          className="size-full"
        />
      </ScaledPreview>
      <div className="flex items-center gap-2 p-2 pl-0">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
          aria-label={`Reorder slide: ${slide.headline ?? "untitled"}`}
        >
          <GripVertical className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{slide.headline || "No headline"}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                STATUS[status].className,
              )}
            >
              {STATUS[status].label}
            </span>
            {warning && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-amber-700"
                title={warning}
              >
                <TriangleAlert className="size-3" aria-hidden />
                {slide.image_width <= slide.image_height ? "Not landscape" : "Low resolution"}
              </span>
            )}
          </div>
        </div>
        <Switch
          checked={slide.active}
          onCheckedChange={onToggle}
          aria-label="Show on the home page"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          onClick={onEdit}
          aria-label="Edit slide"
        >
          <Pencil aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete slide"
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}
