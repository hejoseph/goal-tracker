// Database constants
const DB_NAME = 'goalTrackerDB';
const DB_VERSION = 1;
const GOALS_STORE = 'goals';

// Goal and Step interfaces
export interface Step {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  parentId?: string;
  children: Step[];
  order: number; // Add order property for sorting
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  steps: Step[];
  order: number; // Add order property for sorting
}

// Open database connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(`Error opening database: ${(event.target as IDBRequest).error}`);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result;

      // Create object stores
      if (!db.objectStoreNames.contains(GOALS_STORE)) {
        db.createObjectStore(GOALS_STORE, { keyPath: 'id' });
      }
    };
  });
};

// Database operations
export const db = {
  // Get all goals
  async getAllGoals(): Promise<Goal[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(GOALS_STORE, 'readonly');
      const store = transaction.objectStore(GOALS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  // Get a specific goal
  async getGoal(id: string): Promise<Goal | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(GOALS_STORE, 'readonly');
      const store = transaction.objectStore(GOALS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  // Add a new goal
  async addGoal(goal: Goal): Promise<string> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(GOALS_STORE, 'readwrite');
      const store = transaction.objectStore(GOALS_STORE);
      const request = store.add(goal);

      request.onsuccess = () => {
        resolve(goal.id);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  // Update a goal
  async updateGoal(goal: Goal): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(GOALS_STORE, 'readwrite');
      const store = transaction.objectStore(GOALS_STORE);
      const request = store.put(goal);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  // Delete a goal
  async deleteGoal(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(GOALS_STORE, 'readwrite');
      const store = transaction.objectStore(GOALS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
};

// Helper functions for working with steps
export const stepHelpers = {
  // Find a step by ID within a goal
  findStep(goal: Goal, stepId: string): Step | null {
    const findStepRecursive = (steps: Step[], id: string): Step | null => {
      for (const step of steps) {
        if (step.id === id) {
          return step;
        }

        if (step.children.length > 0) {
          const foundStep = findStepRecursive(step.children, id);
          if (foundStep) {
            return foundStep;
          }
        }
      }

      return null;
    };

    return findStepRecursive(goal.steps, stepId);
  },

  // Add a step to a goal or as a child of another step
  addStep(goal: Goal, step: Step, parentStepId?: string): Goal {
    const updatedGoal = { ...goal, updatedAt: Date.now() };

    if (!parentStepId) {
      updatedGoal.steps = [...updatedGoal.steps, step];
    } else {
      const addStepRecursive = (steps: Step[]): Step[] => {
        return steps.map(s => {
          if (s.id === parentStepId) {
            return {
              ...s,
              children: [...s.children, step]
            };
          }

          if (s.children.length > 0) {
            return {
              ...s,
              children: addStepRecursive(s.children)
            };
          }

          return s;
        });
      };

      updatedGoal.steps = addStepRecursive(updatedGoal.steps);
    }

    return updatedGoal;
  },

  // Update a step within a goal
  updateStep(goal: Goal, updatedStep: Step): Goal {
    const updatedGoal = { ...goal, updatedAt: Date.now() };

    const updateStepRecursive = (steps: Step[]): Step[] => {
      return steps.map(s => {
        if (s.id === updatedStep.id) {
          return { ...updatedStep, children: s.children };
        }

        if (s.children.length > 0) {
          return {
            ...s,
            children: updateStepRecursive(s.children)
          };
        }

        return s;
      });
    };

    updatedGoal.steps = updateStepRecursive(updatedGoal.steps);
    return updatedGoal;
  },

  // Delete a step from a goal
  deleteStep(goal: Goal, stepId: string): Goal {
    const updatedGoal = { ...goal, updatedAt: Date.now() };

    const deleteStepRecursive = (steps: Step[]): Step[] => {
      return steps
        .filter(s => s.id !== stepId)
        .map(s => ({
          ...s,
          children: deleteStepRecursive(s.children)
        }));
    };

    updatedGoal.steps = deleteStepRecursive(updatedGoal.steps);
    return updatedGoal;
  },

  // Toggle the completion status of a step and its children
  toggleStepCompletion(goal: Goal, stepId: string): Goal {
    const updatedGoal = { ...goal, updatedAt: Date.now() };

    const toggleCompletionRecursive = (steps: Step[]): Step[] => {
      return steps.map(s => {
        if (s.id === stepId) {
          const newStatus = !s.completed;
          return {
            ...s,
            completed: newStatus,
            // Always update all children to match parent's status
            children: s.children.map(child => ({
              ...child,
              completed: newStatus,
              children: toggleCompletionRecursiveForce(child.children, newStatus)
            }))
          };
        }

        if (s.children.length > 0) {
          return {
            ...s,
            children: toggleCompletionRecursive(s.children)
          };
        }

        return s;
      });
    };

    // Force all children to have the same status
    const toggleCompletionRecursiveForce = (steps: Step[], status: boolean): Step[] => {
      return steps.map(s => ({
        ...s,
        completed: status,
        children: toggleCompletionRecursiveForce(s.children, status)
      }));
    };

    updatedGoal.steps = toggleCompletionRecursive(updatedGoal.steps);
    return updatedGoal;
  },

  // Duplicate a step and its children
  duplicateStep(goal: Goal, stepId: string): Goal {
    const updatedGoal = { ...goal, updatedAt: Date.now() };
    const stepToDuplicate = this.findStep(goal, stepId);

    if (!stepToDuplicate) return goal;

    const duplicateStepRecursive = (step: Step): Step => {
      return {
        ...step,
        id: generateId(),
        title: `${step.title} (Copy)`,
        children: step.children.map(duplicateStepRecursive)
      };
    };

    const duplicatedStep = duplicateStepRecursive(stepToDuplicate);

    // Find the max order in the current level
    const findMaxOrder = (steps: Step[], parentId?: string): number => {
      return Math.max(
        0,
        ...steps
          .filter(s => s.parentId === parentId)
          .map(s => s.order)
      );
    };

    // Handle root-level steps
    if (!stepToDuplicate.parentId) {
      duplicatedStep.order = findMaxOrder(updatedGoal.steps) + 1;
      updatedGoal.steps = [...updatedGoal.steps, duplicatedStep];
    } else {
      // Find the parent and add the duplicated step as a child
      const addDuplicatedStepToParent = (steps: Step[]): Step[] => {
        return steps.map(s => {
          if (s.id === stepToDuplicate.parentId) {
            duplicatedStep.order = findMaxOrder(s.children, s.id) + 1;
            return {
              ...s,
              children: [...s.children, duplicatedStep]
            };
          }

          if (s.children.length > 0) {
            return {
              ...s,
              children: addDuplicatedStepToParent(s.children)
            };
          }

          return s;
        });
      };

      updatedGoal.steps = addDuplicatedStepToParent(updatedGoal.steps);
    }

    return updatedGoal;
  },

  // Reorder steps within the same parent
  reorderStep(goal: Goal, stepId: string, newIndex: number, parentId?: string): Goal {
    const updatedGoal = { ...goal, updatedAt: Date.now() };

    // Get all steps at the same level (either root or children of a parent)
    const getSiblingsSteps = (steps: Step[], parentId?: string): Step[] => {
      if (!parentId) {
        return steps;
      }

      for (const step of steps) {
        if (step.id === parentId) {
          return step.children;
        }

        if (step.children.length > 0) {
          const nestedSiblings = getSiblingsSteps(step.children, parentId);
          if (nestedSiblings.length > 0) {
            return nestedSiblings;
          }
        }
      }

      return [];
    };

    // Reorder steps within the same parent
    const reorderStepsAtSameLevel = (steps: Step[], sourceId: string, newIndex: number, parentId?: string): Step[] => {
      // If we're reordering steps at root level
      if (!parentId) {
        const reorderedSteps = [...steps];
        const sourceIndex = reorderedSteps.findIndex(s => s.id === sourceId);

        if (sourceIndex < 0) return steps;

        const [movedStep] = reorderedSteps.splice(sourceIndex, 1);
        reorderedSteps.splice(newIndex, 0, movedStep);

        // Update order for all steps
        return reorderedSteps.map((step, index) => ({
          ...step,
          order: index
        }));
      }

      // If we're reordering steps within a parent
      return steps.map(step => {
        if (step.id === parentId) {
          const reorderedChildren = [...step.children];
          const sourceIndex = reorderedChildren.findIndex(s => s.id === sourceId);

          if (sourceIndex < 0) return step;

          const [movedStep] = reorderedChildren.splice(sourceIndex, 1);
          reorderedChildren.splice(newIndex, 0, movedStep);

          // Update order for all children
          return {
            ...step,
            children: reorderedChildren.map((child, index) => ({
              ...child,
              order: index
            }))
          };
        }

        if (step.children.length > 0) {
          return {
            ...step,
            children: reorderStepsAtSameLevel(step.children, sourceId, newIndex, parentId)
          };
        }

        return step;
      });
    };

    updatedGoal.steps = reorderStepsAtSameLevel(updatedGoal.steps, stepId, newIndex, parentId);
    return updatedGoal;
  },

  // Move a step to a different parent
  moveStepToParent(goal: Goal, stepId: string, newParentId?: string): Goal {
    const updatedGoal = { ...goal, updatedAt: Date.now() };
    const stepToMove = this.findStep(goal, stepId);

    if (!stepToMove) return goal;

    // Don't allow moving a step to its own descendant
    const isDescendant = (parentId: string, potentialChildId: string): boolean => {
      const parent = this.findStep(goal, parentId);
      if (!parent) return false;

      for (const child of parent.children) {
        if (child.id === potentialChildId) return true;
        if (isDescendant(child.id, potentialChildId)) return true;
      }

      return false;
    };

    if (newParentId && isDescendant(stepId, newParentId)) {
      return goal;
    }

    // Remove step from its current parent
    const removeStepFromParent = (steps: Step[], stepId: string): Step[] => {
      // Root level steps
      if (steps.some(s => s.id === stepId)) {
        return steps.filter(s => s.id !== stepId);
      }

      // Nested steps
      return steps.map(s => ({
        ...s,
        children: s.children.some(c => c.id === stepId)
          ? s.children.filter(c => c.id !== stepId)
          : removeStepFromParent(s.children, stepId)
      }));
    };

    // Get the maximum order of steps at the target level
    const getMaxOrder = (steps: Step[], parentId?: string): number => {
      if (!parentId) {
        return Math.max(0, ...steps.map(s => s.order));
      }

      const parent = this.findStep(goal, parentId);
      return parent ? Math.max(0, ...parent.children.map(s => s.order)) : 0;
    };

    // First, remove the step from its current location
    const intermediateSteps = removeStepFromParent(updatedGoal.steps, stepId);

    // Then add it to the new parent
    const movedStep = { ...stepToMove, parentId: newParentId };

    if (!newParentId) {
      // Add to root level
      movedStep.order = getMaxOrder(intermediateSteps) + 1;
      updatedGoal.steps = [...intermediateSteps, movedStep];
    } else {
      // Add to a specific parent
      const addStepToNewParent = (steps: Step[]): Step[] => {
        return steps.map(s => {
          if (s.id === newParentId) {
            movedStep.order = getMaxOrder([], s.id) + 1;
            return {
              ...s,
              children: [...s.children, movedStep]
            };
          }

          if (s.children.length > 0) {
            return {
              ...s,
              children: addStepToNewParent(s.children)
            };
          }

          return s;
        });
      };

      updatedGoal.steps = addStepToNewParent(intermediateSteps);
    }

    return updatedGoal;
  },

  // Reorder goals
  reorderGoals(goals: Goal[], sourceIndex: number, destinationIndex: number): Goal[] {
    const reorderedGoals = [...goals];
    const [movedGoal] = reorderedGoals.splice(sourceIndex, 1);
    reorderedGoals.splice(destinationIndex, 0, movedGoal);

    // Update order for all goals
    return reorderedGoals.map((goal, index) => ({
      ...goal,
      order: index
    }));
  }
};

// Generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};
