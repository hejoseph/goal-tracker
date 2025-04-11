'use client';

import { useState } from 'react';
import { useGoals } from '@/contexts/GoalContext';
import type { Goal } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StepItem from './StepItem';
import AddStepForm from './AddStepForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from './ui/input';
import { Trash2, Edit } from 'lucide-react';
import { DragDropContext, Droppable, type DropResult } from 'react-beautiful-dnd';

interface GoalItemProps {
  goal: Goal;
}

export default function GoalItem({ goal }: GoalItemProps) {
  const { deleteGoal, updateGoalDetails, reorderSteps, moveStepToParent } = useGoals();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description || '');

  const totalSteps = countTotalSteps(goal);
  const completedSteps = countCompletedSteps(goal);
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteGoal(goal.id);
    } catch (error) {
      console.error('Failed to delete goal:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editTitle.trim()) return;

    try {
      await updateGoalDetails(goal.id, editTitle, editDescription || undefined);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId, type } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Handling step reordering within the same parent
    if (source.droppableId === destination.droppableId) {
      // Extract parent ID from droppable ID if it's a nested list
      let parentId: string | undefined = undefined;

      if (source.droppableId !== `${goal.id}-steps`) {
        // Format is "{parentId}-children"
        parentId = source.droppableId.split('-')[0];
      }

      reorderSteps(goal.id, draggableId, destination.index, parentId);
    }
    // Moving a step to a different parent
    else {
      // Extract new parent ID from destination droppable ID
      let newParentId: string | undefined = undefined;

      if (destination.droppableId !== `${goal.id}-steps`) {
        // Format is "{parentId}-children"
        newParentId = destination.droppableId.split('-')[0];
      }

      moveStepToParent(goal.id, draggableId, newParentId);
    }
  };

  // Helper function to count total steps (including nested ones)
  function countTotalSteps(goal: Goal): number {
    let count = 0;

    function countRecursive(steps: typeof goal.steps) {
      count += steps.length;

      for (const step of steps) {
        if (step.children && step.children.length > 0) {
          countRecursive(step.children);
        }
      }
    }

    countRecursive(goal.steps);
    return count;
  }

  // Helper function to count completed steps (including nested ones)
  function countCompletedSteps(goal: Goal): number {
    let count = 0;

    function countRecursive(steps: typeof goal.steps) {
      for (const step of steps) {
        if (step.completed) {
          count++;
        }

        if (step.children && step.children.length > 0) {
          countRecursive(step.children);
        }
      }
    }

    countRecursive(goal.steps);
    return count;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{goal.title}</CardTitle>
            {goal.description && (
              <CardDescription className="mt-1">
                {goal.description}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-1">
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Edit size={18} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Goal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-goal-title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="edit-goal-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Goal title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="edit-goal-description" className="text-sm font-medium">
                      Description (optional)
                    </label>
                    <Input
                      id="edit-goal-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Goal description"
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
              <Trash2 size={18} />
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-sm text-muted-foreground">
            Progress: {completedSteps}/{totalSteps} steps ({progress}%)
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Steps</h3>
          <AddStepForm goalId={goal.id} />
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={`${goal.id}-steps`} type="0">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {goal.steps.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No steps yet. Add a step to get started.
                  </p>
                ) : (
                  goal.steps
                    .sort((a, b) => a.order - b.order)
                    .map((step, index) => (
                      <StepItem
                        key={step.id}
                        goalId={goal.id}
                        step={step}
                        level={0}
                        index={index}
                      />
                    ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground pt-1">
        Created: {new Date(goal.createdAt).toLocaleDateString()} |
        Updated: {new Date(goal.updatedAt).toLocaleDateString()}
      </CardFooter>
    </Card>
  );
}
