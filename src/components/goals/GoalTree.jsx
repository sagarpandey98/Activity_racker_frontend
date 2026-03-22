'use client';

import { useEffect, useMemo, useState } from 'react';
import GoalCard from '@/components/goals/GoalCard';

function hasChildren(goal) {
  return Array.isArray(goal?.childGoals) && goal.childGoals.length > 0;
}

export default function GoalTree({ goals, onEdit, onAddChild, onDelete }) {
  const [expanded, setExpanded] = useState(() => ({}));

  const roots = useMemo(() => (Array.isArray(goals) ? goals : []), [goals]);

  useEffect(() => {
    // Default: root goals expanded, children collapsed
    setExpanded((prev) => {
      const next = { ...prev };
      for (const root of roots) {
        if (root?.id && next[root.id] === undefined) next[root.id] = true;
      }
      return next;
    });
  }, [roots]);

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (goal, level) => {
    const children = Array.isArray(goal?.childGoals) ? goal.childGoals : [];
    const showToggle = children.length > 0;
    const isOpen = expanded[goal?.id] ?? false;

    return (
      <div key={goal?.id || `${level}-${goal?.title}`}>
        <GoalCard
          goal={goal}
          level={level}
          isExpanded={isOpen}
          onToggleExpand={showToggle ? () => toggle(goal.id) : undefined}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />

        {showToggle && isOpen && (
          <div className="mt-2 border-l border-white/10 ml-3 pl-3 space-y-2" style={{ paddingLeft: 12, marginLeft: 12 }}>
            {children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {roots.map((goal) => renderNode(goal, 0))}
    </div>
  );
}

