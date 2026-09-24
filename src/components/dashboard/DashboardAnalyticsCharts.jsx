import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { getEffectiveStatus } from '../../services/taskService';

/**
 * Reusable SVG Donut Pie Chart
 */
const SvgDonutChart = ({
  data,
  total,
  centerPrimary,
  centerSecondary,
  hoveredKey,
  onHover,
  onSegmentClick,
}) => {
  const radius = 38;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius; // ~238.76

  let accumulated = 0;

  if (total === 0 || !data || data.length === 0) {
    return (
      <div className="relative w-48 h-48 sm:w-52 sm:h-52 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
          <span className="text-xl font-bold text-slate-400">0</span>
          <span className="text-[11px] text-slate-400">No Data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-48 h-48 sm:w-52 sm:h-52 mx-auto flex items-center justify-center select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />

        {/* Segments */}
        {data.map((item) => {
          const ratio = item.count / total;
          const arcLength = ratio * circumference;
          const strokeDasharray = `${Math.max(0.5, arcLength - 1.5)} ${circumference}`;
          const strokeDashoffset = -accumulated;
          accumulated += arcLength;

          const isHovered = hoveredKey === item.key;
          const isOtherHovered = hoveredKey && hoveredKey !== item.key;

          return (
            <circle
              key={item.key}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-200 cursor-pointer"
              style={{
                opacity: isOtherHovered ? 0.4 : 1,
                filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' : 'none',
              }}
              onMouseEnter={() => onHover && onHover(item.key)}
              onMouseLeave={() => onHover && onHover(null)}
              onClick={() => onSegmentClick && onSegmentClick(item)}
            />
          );
        })}
      </svg>

      {/* Center Details */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
          {centerPrimary}
        </span>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1 line-clamp-1">
          {centerSecondary}
        </span>
      </div>
    </div>
  );
};

export const DashboardAnalyticsCharts = ({
  tasks = [],
  departments = [],
  groups = [],
  onOpenKpiPopup,
  onFilterDepartment,
}) => {
  const [hoveredStatusKey, setHoveredStatusKey] = useState(null);
  const [hoveredDeptKey, setHoveredDeptKey] = useState(null);

  // Status Distribution Calculations
  const statusData = useMemo(() => {
    const total = tasks.length;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    tasks.forEach((t) => {
      const eff = getEffectiveStatus(t);
      if (eff === 'Pending') pending++;
      else if (eff === 'In Progress') inProgress++;
      else if (eff === 'Done' || eff === 'Completed') completed++;
      if (eff === 'Overdue') overdue++;
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const segments = [
      {
        key: 'completed',
        label: 'Completed / Done',
        count: completed,
        color: '#10B981', // emerald-500
        icon: CheckCircle2,
        textColor: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
      },
      {
        key: 'inProgress',
        label: 'In Progress',
        count: inProgress,
        color: '#0EA5E9', // sky-500
        icon: TrendingUp,
        textColor: 'text-sky-700',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200',
      },
      {
        key: 'pending',
        label: 'Pending',
        count: pending,
        color: '#F59E0B', // amber-500
        icon: Clock,
        textColor: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
      },
      {
        key: 'overdue',
        label: 'Overdue',
        count: overdue,
        color: '#F43F5E', // rose-500
        icon: AlertTriangle,
        textColor: 'text-rose-700',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
      },
    ].filter((s) => s.count > 0);

    return {
      total,
      completionRate,
      segments,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }, [tasks]);

  // Department-Wise Distribution Calculations
  const departmentData = useMemo(() => {
    const list = departments && departments.length > 0 ? departments : groups;

    const modernPalette = [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#8B5CF6', // Purple
      '#F59E0B', // Amber
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#F97316', // Orange
      '#6366F1', // Indigo
      '#14B8A6', // Teal
      '#84CC16', // Lime
    ];

    const stats = list
      .map((dept, index) => {
        const deptTasks = tasks.filter(
          (t) => t.department === dept.id || t.groupId === dept.id
        );

        let pending = 0;
        let completed = 0;
        let overdue = 0;

        deptTasks.forEach((t) => {
          const eff = getEffectiveStatus(t);
          if (eff === 'Pending' || eff === 'In Progress') pending++;
          if (eff === 'Done' || eff === 'Completed') completed++;
          if (eff === 'Overdue') overdue++;
        });

        const rate = deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0;

        return {
          key: dept.id,
          id: dept.id,
          label: dept.name,
          count: deptTasks.length,
          pending,
          completed,
          overdue,
          completionRate: rate,
          color: modernPalette[index % modernPalette.length],
        };
      })
      .filter((d) => d.count > 0);

    // Any unassigned tasks
    const matchedCount = stats.reduce((sum, d) => sum + d.count, 0);
    const unassignedCount = tasks.length - matchedCount;
    if (unassignedCount > 0) {
      stats.push({
        key: 'other',
        id: 'other',
        label: 'General / Other',
        count: unassignedCount,
        pending: 0,
        completed: 0,
        overdue: 0,
        completionRate: 0,
        color: '#94A3B8',
      });
    }

    // Sort descending by task count
    stats.sort((a, b) => b.count - a.count);

    return {
      total: tasks.length,
      activeDeptCount: stats.length,
      segments: stats,
    };
  }, [tasks, departments, groups]);

  // Dynamic center text for Status Donut
  const hoveredStatusItem = statusData.segments.find((s) => s.key === hoveredStatusKey);
  const statusCenterPrimary = hoveredStatusItem
    ? hoveredStatusItem.count
    : `${statusData.completionRate}%`;
  const statusCenterSecondary = hoveredStatusItem
    ? `${hoveredStatusItem.label} (${Math.round((hoveredStatusItem.count / (statusData.total || 1)) * 100)}%)`
    : 'Completion Rate';

  // Dynamic center text for Department Donut
  const hoveredDeptItem = departmentData.segments.find((s) => s.key === hoveredDeptKey);
  const deptCenterPrimary = hoveredDeptItem
    ? hoveredDeptItem.count
    : departmentData.total;
  const deptCenterSecondary = hoveredDeptItem
    ? hoveredDeptItem.label
    : `${departmentData.activeDeptCount} Departments`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ============================================================ */}
      {/* CARD 1: TASK STATUS DISTRIBUTION (KITTA PENDING, DONE, ETC.) */}
      {/* ============================================================ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Task Status Distribution</h3>
                <p className="text-xs text-slate-400">Total {statusData.total} Assigned Tasks Breakdown</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {statusData.completionRate}% Done
            </span>
          </div>

          {/* Chart + Legend Container */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-6">
            {/* Donut Chart */}
            <div className="shrink-0">
              <SvgDonutChart
                data={statusData.segments}
                total={statusData.total}
                centerPrimary={statusCenterPrimary}
                centerSecondary={statusCenterSecondary}
                hoveredKey={hoveredStatusKey}
                onHover={setHoveredStatusKey}
                onSegmentClick={(item) => onOpenKpiPopup && onOpenKpiPopup(item.key)}
              />
            </div>

            {/* Legend Breakdown */}
            <div className="flex-1 w-full space-y-2">
              {statusData.segments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No active tasks found in current filter.
                </p>
              ) : (
                statusData.segments.map((item) => {
                  const percent = Math.round((item.count / (statusData.total || 1)) * 100);
                  const isHovered = hoveredStatusKey === item.key;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onMouseEnter={() => setHoveredStatusKey(item.key)}
                      onMouseLeave={() => setHoveredStatusKey(null)}
                      onClick={() => onOpenKpiPopup && onOpenKpiPopup(item.key)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                        isHovered
                          ? `${item.bgColor} ${item.borderColor} shadow-xs scale-[1.02]`
                          : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${item.textColor}`} />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-900">
                          {item.count}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {percent}%
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Footer hint */}
        <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Click any status above to view tasks list</span>
          <span className="font-semibold text-slate-600">
            {statusData.pending + statusData.inProgress} Pending Action
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD 2: DEPARTMENT-WISE TASK DISTRIBUTION                     */}
      {/* ============================================================ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Department Workload</h3>
                <p className="text-xs text-slate-400">Tasks Distribution by Department</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              {departmentData.activeDeptCount} Active
            </span>
          </div>

          {/* Chart + List Container */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-6">
            {/* Donut Chart */}
            <div className="shrink-0">
              <SvgDonutChart
                data={departmentData.segments}
                total={departmentData.total}
                centerPrimary={deptCenterPrimary}
                centerSecondary={deptCenterSecondary}
                hoveredKey={hoveredDeptKey}
                onHover={setHoveredDeptKey}
                onSegmentClick={(item) => onFilterDepartment && onFilterDepartment(item.id)}
              />
            </div>

            {/* Department List with miniature progress bars */}
            <div className="flex-1 w-full space-y-2 max-h-56 overflow-y-auto pr-1">
              {departmentData.segments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No department tasks found.
                </p>
              ) : (
                departmentData.segments.map((dept) => {
                  const percent = Math.round((dept.count / (departmentData.total || 1)) * 100);
                  const isHovered = hoveredDeptKey === dept.key;

                  return (
                    <div
                      key={dept.key}
                      onMouseEnter={() => setHoveredDeptKey(dept.key)}
                      onMouseLeave={() => setHoveredDeptKey(null)}
                      onClick={() => onFilterDepartment && onFilterDepartment(dept.id)}
                      className={`p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isHovered
                          ? 'bg-blue-50/70 border-blue-200 shadow-xs scale-[1.01]'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: dept.color }}
                          />
                          <span className="font-semibold text-slate-800 truncate">
                            {dept.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-slate-900">{dept.count} tasks</span>
                          <span className="text-[10px] text-slate-400 font-medium">({percent}%)</span>
                        </div>
                      </div>

                      {/* Mini progress bar: Done vs Pending */}
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${dept.completionRate}%` }}
                          title={`Completed: ${dept.completed}`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{dept.completed} Done ({dept.completionRate}%)</span>
                        <span className={dept.overdue > 0 ? 'text-rose-600 font-bold' : ''}>
                          {dept.pending} Pending {dept.overdue > 0 ? `• ${dept.overdue} Overdue` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Footer */}
        <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Click department to filter hierarchy</span>
          <span className="font-semibold text-slate-600">
            {departmentData.total} Total Tasks
          </span>
        </div>
      </div>
    </div>
  );
};
