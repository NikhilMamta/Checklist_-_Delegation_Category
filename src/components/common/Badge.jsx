import React from 'react';

export const PriorityBadge = ({ priority }) => {
  const styles = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-blue-50 text-blue-700 border-blue-200',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Urgent: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold animate-pulse',
  };

  const style = styles[priority] || styles.Medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {priority}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const styles = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    'In Progress': 'bg-sky-50 text-sky-700 border-sky-200',
    Done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Not Done': 'bg-rose-50 text-rose-700 border-rose-200',
    Overdue: 'bg-red-100 text-red-800 border-red-300 font-semibold',
    Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const style = styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'Done' || status === 'Completed' || status === 'Active'
            ? 'bg-emerald-500'
            : status === 'Overdue' || status === 'Not Done'
            ? 'bg-red-500'
            : status === 'In Progress'
            ? 'bg-sky-500'
            : status === 'Pending'
            ? 'bg-amber-500'
            : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  );
};

export const TaskTypeBadge = ({ type }) => {
  if (type === 'Checklist') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        Checklist
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
      Delegation
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      {category || 'General'}
    </span>
  );
};

export const SubcategoryBadge = ({ subcategory }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {subcategory || 'General'}
    </span>
  );
};
