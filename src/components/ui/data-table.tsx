import * as React from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  X,
  Edit2,
  Check,
  X as XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Types
export type SortDirection = 'asc' | 'desc' | null;
export type ColumnFilterType = 'text' | 'select' | 'date' | 'number';

export interface Column<T = any> {
  id: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T | ((row: T) => any);
  cell?: (value: any, row: T) => React.ReactNode;
  enableSorting?: boolean;
  enableResizing?: boolean;
  enableFiltering?: boolean;
  filterType?: ColumnFilterType;
  filterOptions?: { label: string; value: any }[];
  sortFn?: (a: T, b: T) => number;
  minWidth?: number;
  maxWidth?: number;
  width?: number;
  editable?: boolean;
  editComponent?: (value: any, row: T, onSave: (value: any) => void) => React.ReactNode;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  onRowSelect?: (selectedRows: T[]) => void;
  onRowEdit?: (row: T, columnId: string, value: any) => void | Promise<void>;
  onExport?: (format: 'csv' | 'pdf', selectedRows?: T[]) => void;
  enableSelection?: boolean;
  enableSorting?: boolean;
  enableResizing?: boolean;
  enableFiltering?: boolean;
  enableExpanding?: boolean;
  renderExpandableContent?: (row: T) => React.ReactNode;
  enableExport?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  getRowId?: (row: T) => string;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  stickyHeader?: boolean;
}

// Utility functions
function defaultSortFn<T>(
  a: T,
  b: T,
  accessor: keyof T | ((row: T) => any),
  direction: SortDirection
): number {
  const getValue = typeof accessor === 'function' ? accessor : (row: T) => row[accessor];
  const aVal = getValue(a);
  const bVal = getValue(b);

  if (aVal == null && bVal == null) return 0;
  if (aVal == null) return 1;
  if (bVal == null) return -1;

  if (typeof aVal === 'string' && typeof bVal === 'string') {
    return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  }

  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  }

  return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
}

function exportToCSV<T>(data: T[], columns: Column<T>[], filename: string = 'export.csv') {
  const headers = columns.map((col) => col.header).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value =
          typeof col.accessorKey === 'function'
            ? col.accessorKey(row)
            : col.accessorKey
              ? row[col.accessorKey]
              : '';
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Main DataTable Component
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowSelect,
  onRowEdit,
  onExport,
  enableSelection = false,
  enableSorting = true,
  enableResizing = false,
  enableFiltering = true,
  enableExpanding = false,
  renderExpandableContent,
  enableExport = true,
  enablePagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  getRowId = (row: T) => row.id?.toString() || String(Math.random()),
  className,
  emptyMessage = 'No data available',
  loading = false,
  stickyHeader = false,
}: DataTableProps<T>) {
  // State
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; columnId: string } | null>(
    null
  );
  const [editValue, setEditValue] = React.useState<any>(null);
  const [resizingColumn, setResizingColumn] = React.useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = React.useState(0);
  const [resizeStartWidth, setResizeStartWidth] = React.useState(0);

  // Initialize column widths
  React.useEffect(() => {
    const widths: Record<string, number> = {};
    columns.forEach((col) => {
      if (col.width) widths[col.id] = col.width;
      else if (col.minWidth) widths[col.id] = col.minWidth;
      else widths[col.id] = 150;
    });
    setColumnWidths(widths);
  }, [columns]);

  // Sorting
  const handleSort = (columnId: string) => {
    if (!enableSorting) return;
    const column = columns.find((col) => col.id === columnId);
    if (!column || !column.enableSorting) return;

    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  // Filtering
  const handleFilter = (columnId: string, value: any) => {
    setFilters((prev) => ({ ...prev, [columnId]: value || undefined }));
    setCurrentPage(1);
  };

  const clearFilter = (columnId: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  };

  // Selection
  const toggleRowSelection = (rowId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === filteredAndSortedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedData.map((row) => getRowId(row))));
    }
  };

  // Expanding
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // Resizing
  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    if (!enableResizing) return;
    e.preventDefault();
    setResizingColumn(columnId);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnId] || 150);

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn === columnId) {
        const diff = e.clientX - resizeStartX;
        const newWidth = Math.max(
          columns.find((col) => col.id === columnId)?.minWidth || 50,
          Math.min(
            columns.find((col) => col.id === columnId)?.maxWidth || Infinity,
            resizeStartWidth + diff
          )
        );
        setColumnWidths((prev) => ({ ...prev, [columnId]: newWidth }));
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Editing
  const startEdit = (rowId: string, columnId: string, currentValue: any) => {
    setEditingCell({ rowId, columnId });
    setEditValue(currentValue);
  };

  const saveEdit = async (row: T, columnId: string) => {
    if (onRowEdit && editingCell) {
      await onRowEdit(row, columnId, editValue);
    }
    setEditingCell(null);
    setEditValue(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue(null);
  };

  // Export
  const handleExport = (format: 'csv' | 'pdf') => {
    const rowsToExport =
      selectedRows.size > 0
        ? data.filter((row) => selectedRows.has(getRowId(row)))
        : filteredAndSortedData;

    if (onExport) {
      onExport(format, rowsToExport);
    } else if (format === 'csv') {
      exportToCSV(rowsToExport, columns, `export-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // PDF export would require a library like jsPDF
      console.warn('PDF export not implemented. Please provide onExport handler.');
    }
  };

  // Filter and sort data
  let filteredAndSortedData = [...data];

  // Apply filters
  Object.entries(filters).forEach(([columnId, filterValue]) => {
    if (filterValue == null || filterValue === '') return;
    const column = columns.find((col) => col.id === columnId);
    if (!column) return;

    filteredAndSortedData = filteredAndSortedData.filter((row) => {
      const value =
        typeof column.accessorKey === 'function'
          ? column.accessorKey(row)
          : column.accessorKey
            ? row[column.accessorKey]
            : null;

      if (column.filterType === 'text') {
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      } else if (column.filterType === 'select') {
        return value === filterValue;
      } else if (column.filterType === 'number') {
        return Number(value) === Number(filterValue);
      }
      return String(value).includes(String(filterValue));
    });
  });

  // Apply sorting
  if (sortColumn && sortDirection) {
    const column = columns.find((col) => col.id === sortColumn);
    if (column && column.accessorKey) {
      filteredAndSortedData.sort((a, b) => {
        if (column.sortFn) {
          return column.sortFn(a, b) * (sortDirection === 'asc' ? 1 : -1);
        }
        return defaultSortFn(a, b, column.accessorKey!, sortDirection);
      });
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const paginatedData = enablePagination
    ? filteredAndSortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredAndSortedData;

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onRowSelect) {
      const selected = data.filter((row) => selectedRows.has(getRowId(row)));
      onRowSelect(selected);
    }
  }, [selectedRows, data, getRowId, onRowSelect]);

  // Render cell content
  const renderCell = (row: T, column: Column<T>) => {
    const rowId = getRowId(row);
    const value =
      typeof column.accessorKey === 'function'
        ? column.accessorKey(row)
        : column.accessorKey
          ? row[column.accessorKey]
          : null;

    if (editingCell?.rowId === rowId && editingCell?.columnId === column.id && column.editable) {
      if (column.editComponent) {
        return column.editComponent(value, row, (newValue) => {
          setEditValue(newValue);
        });
      }
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue ?? value ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8"
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit(row, column.id);
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => saveEdit(row, column.id)}
            aria-label="Save edit"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={cancelEdit}
            aria-label="Cancel edit"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (column.cell) {
      return column.cell(value, row);
    }

    if (column.editable && !editingCell) {
      return (
        <div className="flex items-center gap-2 group">
          <span>{value != null ? String(value) : ''}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => startEdit(rowId, column.id, value)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return value != null ? String(value) : '';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {enableFiltering && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {Object.keys(filters).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.keys(filters).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {Object.keys(filters).length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                        Clear all
                      </Button>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {columns
                      .filter((col) => col.enableFiltering !== false)
                      .map((column) => (
                        <div key={column.id} className="space-y-2">
                          <label className="text-sm font-medium">{String(column.header)}</label>
                          {column.filterType === 'select' && column.filterOptions ? (
                            <Select
                              value={filters[column.id] || ''}
                              onValueChange={(value) => handleFilter(column.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Filter ${column.header}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">All</SelectItem>
                                {column.filterOptions.map((option) => (
                                  <SelectItem key={option.value} value={String(option.value)}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder={`Filter ${column.header}...`}
                                value={filters[column.id] || ''}
                                onChange={(e) => handleFilter(column.id, e.target.value)}
                                className="flex-1"
                              />
                              {filters[column.id] && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => clearFilter(column.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {enableExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                {selectedRows.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        const selected = data.filter((row) => selectedRows.has(getRowId(row)));
                        if (onExport) onExport('csv', selected);
                        else exportToCSV(selected, columns);
                      }}
                    >
                      Export Selected ({selectedRows.size})
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {enablePagination && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className={stickyHeader ? 'sticky top-0 z-10 bg-background' : ''}>
            <TableRow>
              {enableExpanding && <TableHead style={{ width: 40 }}></TableHead>}
              {enableSelection && (
                <TableHead style={{ width: 50 }}>
                  <Checkbox
                    checked={
                      selectedRows.size > 0 && selectedRows.size === filteredAndSortedData.length
                    }
                    onCheckedChange={toggleAllSelection}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={{
                    width: columnWidths[column.id] || column.width || column.minWidth || 150,
                    minWidth: column.minWidth || 50,
                    maxWidth: column.maxWidth,
                    position: 'relative',
                  }}
                  className={cn(
                    column.enableSorting !== false &&
                      enableSorting &&
                      'cursor-pointer hover:bg-muted/50',
                    'select-none'
                  )}
                  onClick={() =>
                    column.enableSorting !== false && enableSorting && handleSort(column.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {typeof column.header === 'string' ? column.header : column.header}
                      {column.enableSorting !== false && enableSorting && (
                        <span className="inline-flex flex-col">
                          {sortColumn === column.id ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                    {enableResizing && column.enableResizing !== false && (
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                        role="slider"
                        aria-orientation="vertical"
                        tabIndex={0}
                        aria-label={`Resize ${String(column.header)}`}
                        aria-valuemin={
                          columns.find((col) => col.id === column.id)?.minWidth ?? 50
                        }
                        aria-valuemax={
                          columns.find((col) => col.id === column.id)?.maxWidth ?? Infinity
                        }
                        aria-valuenow={columnWidths[column.id] || 150}
                        onMouseDown={(e) => handleResizeStart(column.id, e)}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            event.preventDefault();
                            const columnConfig = columns.find(
                              (col) => col.id === column.id
                            );
                            const minWidth = columnConfig?.minWidth ?? 50;
                            const maxWidth = columnConfig?.maxWidth ?? Infinity;
                            const currentWidth = columnWidths[column.id] || 150;
                            const delta = event.key === 'ArrowLeft' ? -10 : 10;
                            const newWidth = Math.max(
                              minWidth,
                              Math.min(maxWidth, currentWidth + delta)
                            );
                            setColumnWidths((prev) => ({ ...prev, [column.id]: newWidth }));
                          }
                        }}
                      >
                        <GripVertical className="h-4 w-4 absolute right-0 top-1/2 -translate-y-1/2 opacity-50" />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableSelection ? 1 : 0) + (enableExpanding ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableSelection ? 1 : 0) + (enableExpanding ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedRows.has(rowId);
                const isExpanded = expandedRows.has(rowId);

                return (
                  <React.Fragment key={rowId}>
                    <TableRow
                      data-state={isSelected ? 'selected' : undefined}
                      className={cn(isSelected && 'bg-muted/50')}
                    >
                      {enableExpanding && (
                        <TableCell style={{ width: 40 }}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => toggleRowExpansion(rowId)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                      {enableSelection && (
                        <TableCell style={{ width: 50 }}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRowSelection(rowId)}
                            aria-label={`Select row ${rowId}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          style={{
                            width:
                              columnWidths[column.id] || column.width || column.minWidth || 150,
                            minWidth: column.minWidth || 50,
                            maxWidth: column.maxWidth,
                          }}
                        >
                          {renderCell(row, column)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {enableExpanding && isExpanded && renderExpandableContent && (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length + (enableSelection ? 1 : 0) + 1}
                          className="bg-muted/30 p-4"
                        >
                          {renderExpandableContent(row)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredAndSortedData.length)} of{' '}
            {filteredAndSortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
