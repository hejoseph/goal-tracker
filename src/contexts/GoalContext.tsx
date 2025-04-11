'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { db, type Goal, type Step, stepHelpers, generateId } from '@/lib/db';

interface GoalContextType {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  addGoal: (title: string, description?: string) => Promise<string>;
  updateGoalDetails: (id: string, title: string, description?: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addStep: (goalId: string, title: string, description?: string, parentStepId?: string) => Promise<void>;
  updateStep: (goalId: string, stepId: string, title: string, description?: string) => Promise<void>;
  deleteStep: (goalId: string, stepId: string) => Promise<void>;
  toggleStepCompletion: (goalId: string, stepId: string) => Promise<void>;
  reorderGoals: (sourceIndex: number, destinationIndex: number) => Promise<void>;
  reorderSteps: (goalId: string, stepId: string, newIndex: number, parentId?: string) => Promise<void>;
  moveStepToParent: (goalId: string, stepId: string, newParentId?: string) => Promise<void>;
  duplicateStep: (goalId: string, stepId: string) => Promise<void>;
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export function GoalProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load goals from IndexedDB on mount
  useEffect(() => {
    const loadGoals = async () => {
      try {
        setLoading(true);
        const loadedGoals = await db.getAllGoals();

        // Sort goals by order
        const sortedGoals = [...loadedGoals].sort((a, b) => a.order - b.order);
        setGoals(sortedGoals);
        setError(null);
      } catch (err) {
        console.error('Failed to load goals:', err);
        setError('Failed to load goals. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, []);

  // Add a new goal
  const addGoal = async (title: string, description?: string): Promise<string> => {
    // Find the maximum order to place the new goal at the end
    const maxOrder = goals.length > 0
      ? Math.max(...goals.map(g => g.order))
      : -1;

    const newGoal: Goal = {
      id: generateId(),
      title,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [],
      order: maxOrder + 1
    };

    try {
      await db.addGoal(newGoal);
      setGoals(prevGoals => [...prevGoals, newGoal]);
      return newGoal.id;
    } catch (err) {
      console.error('Failed to add goal:', err);
      setError('Failed to add goal. Please try again later.');
      throw err;
    }
  };

  // Update goal details
  const updateGoalDetails = async (id: string, title: string, description?: string): Promise<void> => {
    try {
      const goalToUpdate = goals.find(g => g.id === id);
      if (!goalToUpdate) {
        throw new Error('Goal not found');
      }

      const updatedGoal = {
        ...goalToUpdate,
        title,
        description,
        updatedAt: Date.now()
      };

      await db.updateGoal(updatedGoal);
      setGoals(prevGoals => prevGoals.map(g => g.id === id ? updatedGoal : g));
    } catch (err) {
      console.error('Failed to update goal:', err);
      setError('Failed to update goal. Please try again later.');
      throw err;
    }
  };

  // Delete a goal
  const deleteGoal = async (id: string): Promise<void> => {
    try {
      await db.deleteGoal(id);
      setGoals(prevGoals => prevGoals.filter(g => g.id !== id));
    } catch (err) {
      console.error('Failed to delete goal:', err);
      setError('Failed to delete goal. Please try again later.');
      throw err;
    }
  };

  // Add a step to a goal or as a child of another step
  const addStep = async (goalId: string, title: string, description?: string, parentStepId?: string): Promise<void> => {
    try {
      const goalToUpdate = goals.find(g => g.id === goalId);
      if (!goalToUpdate) {
        throw new Error('Goal not found');
      }

      // Find the maximum order in the current level
      let maxOrder = -1;

      if (!parentStepId) {
        // Root level steps
        maxOrder = goalToUpdate.steps.length > 0
          ? Math.max(...goalToUpdate.steps.map(s => s.order))
          : -1;
      } else {
        // Find the parent step
        const findParent = (steps: Step[]): Step | null => {
          for (const step of steps) {
            if (step.id === parentStepId) {
              return step;
            }

            if (step.children.length > 0) {
              const foundParent = findParent(step.children);
              if (foundParent) {
                return foundParent;
              }
            }
          }
          return null;
        };

        const parent = findParent(goalToUpdate.steps);
        if (parent && parent.children.length > 0) {
          maxOrder = Math.max(...parent.children.map(s => s.order));
        }
      }

      const newStep: Step = {
        id: generateId(),
        title,
        description,
        completed: false,
        parentId: parentStepId,
        children: [],
        order: maxOrder + 1
      };

      const updatedGoal = stepHelpers.addStep(goalToUpdate, newStep, parentStepId);

      await db.updateGoal(updatedGoal);
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (err) {
      console.error('Failed to add step:', err);
      setError('Failed to add step. Please try again later.');
      throw err;
    }
  };

  // Update a step
  const updateStep = async (goalId: string, stepId: string, title: string, description?: string): Promise<void> => {
    try {
      const goalToUpdate = goals.find(g => g.id === goalId);
      if (!goalToUpdate) {
        throw new Error('Goal not found');
      }

      const existingStep = stepHelpers.findStep(goalToUpdate, stepId);
      if (!existingStep) {
        throw new Error('Step not found');
      }

      const updatedStep: Step = {
        ...existingStep,
        title,
        description
      };

      const updatedGoal = stepHelpers.updateStep(goalToUpdate, updatedStep);

      await db.updateGoal(updatedGoal);
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (err) {
      console.error('Failed to update step:', err);
      setError('Failed to update step. Please try again later.');
      throw err;
    }
  };

  // Delete a step
  const deleteStep = async (goalId: string, stepId: string): Promise<void> => {
    try {
      const goalToUpdate = goals.find(g => g.id === goalId);
      if (!goalToUpdate) {
        throw new Error('Goal not found');
      }

      const updatedGoal = stepHelpers.deleteStep(goalToUpdate, stepId);

      await db.updateGoal(updatedGoal);
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (err) {
      console.error('Failed to delete step:', err);
      setError('Failed to delete step. Please try again later.');
      throw err;
    }
  };

  // Toggle step completion
  const toggleStepCompletion = async (goalId: string, stepId: string): Promise<void> => {
    try {
      const goalToUpdate = goals.find(g => g.id === goalId);
      if (!goalToUpdate) {
        throw new Error('Goal not found');
      }

      const updatedGoal = stepHelpers.toggleStepCompletion(goalToUpdate, stepId);

      await db.updateGoal(updatedGoal);
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (err) {
      console.error('Failed to toggle step completion:', err);
      setError('Failed to toggle step completion. Please try again later.');
      throw err;
    }
  };

  // Reorder goals
  const reorderGoals = async (sourceIndex: number, destinationIndex: number): Promise<void> => {
    try {
      const updatedGoals = stepHelpers.reorderGoals(goals, sourceIndex, destinationIndex);

      // Update all goals in database
      for (const goal of updatedGoals) {
        await db.updateGoal(goal);
      }

      setGoals(updatedGoals);
    } catch (err) {
      console.error('Failed to reorder goals:', err);
      setError('Failed to reorder goals. Please try again later.');
      throw err;
    }
  };

  // Reorder steps within the same parent
  const reorderSteps = async (goalId: string, stepId: string, newIndex: number, parentId?: string): Promise<void> => {
    try {
      const goalToUpdate = goals.find(g => g.id === goalId);
      if (!goalToUpdate) {
        throw new Error('Goal not found');
      }

      const updatedGoal = stepHelpers.reorderStep(goalToUpdate, stepId, newIndex, parentId);

      await db.updateGoal(updatedGoal);
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (err) {
      console.error('Failed to reorder steps:', err);
      setError('Failed to reorder steps. Please try again later.');
      throw err;
    }
  };

  // Move step to a different parent
  const moveStepToParent = async (goalId: string, stepId: string, newParentId?: string): Promise<void> => {
    try {
      const goalToUpdate = goals.find(g => g.id === goalId);
      if (!goalToUpdate) {
        throw new Error('Goal not found');
      }

      const updatedGoal = stepHelpers.moveStepToParent(goalToUpdate, stepId, newParentId);

      await db.updateGoal(updatedGoal);
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (err) {
      console.error('Failed to move step:', err);
      setError('Failed to move step. Please try again later.');
      throw err;
    }
  };

  // Duplicate a step
  const duplicateStep = async (goalId: string, stepId: string): Promise<void> => {
    try {
      const goalToUpdate = goals.find(g => g.id === goalId);
      if (!goalToUpdate) {
        throw new Error('Goal not found');
      }

      const updatedGoal = stepHelpers.duplicateStep(goalToUpdate, stepId);

      await db.updateGoal(updatedGoal);
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? updatedGoal : g));
    } catch (err) {
      console.error('Failed to duplicate step:', err);
      setError('Failed to duplicate step. Please try again later.');
      throw err;
    }
  };

  return (
    <GoalContext.Provider
      value={{
        goals,
        loading,
        error,
        addGoal,
        updateGoalDetails,
        deleteGoal,
        addStep,
        updateStep,
        deleteStep,
        toggleStepCompletion,
        reorderGoals,
        reorderSteps,
        moveStepToParent,
        duplicateStep
      }}
    >
      {children}
    </GoalContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalProvider');
  }
  return context;
}
