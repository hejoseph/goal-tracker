'use client';

import { useState } from 'react';
import { useGoals } from '@/contexts/GoalContext';
import type { Step } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import AddStepForm from './AddStepForm';
import { ChevronRight, Trash2, Edit, Copy, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from './ui/input';
import { Draggable, Droppable } from 'react-beautiful-dnd';

interface StepItemProps {
  goalId: string;
  step: Step;
  level: number;
  index: number;
  parentId?: string;
}

export default function StepItem({ goalId, step, level, index, parentId }: StepItemProps) {
  const { toggleStepCompletion, deleteStep, updateStep, duplicateStep } = useGoals();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [editDescription, setEditDescription] = useState(step.description || '');
  const [isDuplicating, setIsDuplicating] = useState(false);

  const hasChildren = step.children && step.children.length > 0;
  const accordionValue = hasChildren ? step.id : '';
  const droppableId = parentId ? `${parentId}-children` : `${goalId}-steps`;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      setIsDeleting(true);
      await deleteStep(goalId, step.id);
    } catch (error) {
      console.error('Failed to delete step:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleCompletion = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await toggleStepCompletion(goalId, step.id);
    } catch (error) {
      console.error('Failed to toggle step completion:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editTitle.trim()) return;

    try {
      await updateStep(goalId, step.id, editTitle, editDescription || undefined);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      setIsDuplicating(true);
      await duplicateStep(goalId, step.id);
    } catch (error) {
      console.error('Failed to duplicate step:', error);
    } finally {
      setIsDuplicating(false);
    }
  };

  // Style based on nesting level for better visualization
  const levelIndentClass = level > 0 ? `ml-${Math.min(level, 5) * 2}` : '';
  const levelBorderClass = level === 0 ? 'border-slate-400' :
                          level === 1 ? 'border-slate-300' :
                          level === 2 ? 'border-slate-200' : 'border-slate-100';

  return (
    <Draggable draggableId={step.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-2 ${levelIndentClass}`}
        >
          <div className={`rounded-md border ${levelBorderClass} bg-card p-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <div
                  {...provided.dragHandleProps}
                  className="cursor-grab text-muted-foreground hover:text-foreground"
                >
                  <GripVertical size={16} />
                </div>
                <div
                  onClick={handleToggleCompletion}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Checkbox
                    checked={step.completed}
                    onCheckedChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className={`text-md ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {step.title}
                  </span>
                </div>

                {step.description && !step.completed && (
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description.length > 30
                      ? `${step.description.substring(0, 30)}...`
                      : step.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDuplicate}
                  disabled={isDuplicating}
                >
                  <Copy size={16} />
                </Button>

                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Step</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="edit-title" className="text-sm font-medium">
                          Title
                        </label>
                        <Input
                          id="edit-title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Step title"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="edit-description" className="text-sm font-medium">
                          Description (optional)
                        </label>
                        <Input
                          id="edit-description"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Step description"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Save Changes</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 size={16} />
                </Button>

                <AddStepForm
                  goalId={goalId}
                  parentStepId={step.id}
                />
              </div>
            </div>

            {step.description && (
              <p className="text-sm text-muted-foreground mt-1 sm:hidden">
                {step.description}
              </p>
            )}
          </div>

          {hasChildren && (
            <Accordion
              type="single"
              collapsible
              defaultValue={accordionValue}
              className="mt-1"
            >
              <AccordionItem value={step.id} className="border-none">
                <AccordionTrigger className="py-1 px-2">
                  <span className="text-xs font-medium">
                    {step.children.length} Sub-step{step.children.length !== 1 ? 's' : ''}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <Droppable droppableId={`${step.id}-children`} type={`${level + 1}`}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-1 pt-1"
                      >
                        {step.children
                          .sort((a, b) => a.order - b.order)
                          .map((childStep, childIndex) => (
                            <StepItem
                              key={childStep.id}
                              goalId={goalId}
                              step={childStep}
                              level={level + 1}
                              index={childIndex}
                              parentId={step.id}
                            />
                          ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}
    </Draggable>
  );
}
