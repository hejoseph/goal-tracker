'use client';

import { useGoals } from '@/contexts/GoalContext';
import GoalItem from '@/components/GoalItem';
import AddGoalForm from '@/components/AddGoalForm';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';

export default function HomePage() {
  const { goals, loading, error, reorderGoals } = useGoals();

  const handleDragEnd = (result: DropResult) => {
    // Dropped outside the list
    if (!result.destination) {
      return;
    }

    // Same position
    if (result.destination.index === result.source.index) {
      return;
    }

    // Reorder goals
    reorderGoals(result.source.index, result.destination.index);
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Goal Tracker</h1>
        <p className="text-muted-foreground">
          Set project goals, break them down into steps, and track your progress
        </p>
      </header>

      <div className="grid md:grid-cols-[1fr_2fr] gap-8">
        <div>
          <AddGoalForm />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Your Goals</h2>

          {loading ? (
            <div className="text-center py-8">
              <p className="animate-pulse">Loading goals...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">You don't have any goals yet.</p>
              <p className="text-muted-foreground">Create a new goal to get started!</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="goals-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {goals.map((goal, index) => (
                      <Draggable
                        key={goal.id}
                        draggableId={goal.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="mb-6"
                          >
                            <GoalItem goal={goal} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>
    </div>
  );
}
