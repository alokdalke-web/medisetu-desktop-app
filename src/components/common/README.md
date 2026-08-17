# CommonTable Component Library

A comprehensive, production-ready, and highly configurable table component for use across the entire MediSetu application. The CommonTable component is designed to be flexible, scalable, and easy to use with minimal configuration.

## Features

- ✨ **Dynamic Columns Configuration** - Define columns with flexible configuration
- 🎯 **Custom Cell Rendering** - Render complex content in table cells
- 🔄 **Sorting** - Built-in support for column sorting
- 🔍 **Searching** - Full-text search across searchable columns
- 📄 **Pagination** - Complete pagination with configurable page sizes
- ⚡ **Row Actions** - Single or multiple actions per row with dropdown menu
- ☑️ **Row Selection** - Single or multiple row selection with checkboxes
- 🎨 **Status Badges** - Built-in support for status chips/badges
- ⚙️ **Loading States** - Loading skeleton and spinner support
- 📭 **Empty States** - Customizable empty state displays
- ❌ **Error States** - Error handling with retry options
- 📱 **Responsive Design** - Mobile-friendly responsive layout
- ♿ **Accessibility** - Full WCAG compliance with proper ARIA labels
- ⌨️ **Keyboard Navigation** - Tab, Enter, Space support
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive types
- ⚡ **Performance** - Memoization and optimized re-renders

## Installation

The CommonTable component is already part of the MediSetu component library. Simply import it:

```typescript
import { CommonTable, type CommonTableProps } from "@/components/common";
```

## Quick Start

### Basic Table

```typescript
import { CommonTable } from "@/components/common";

const MyTable = () => {
  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email" },
    { key: "status", label: "Status" },
  ];

  const data = [
    { id: 1, name: "John Doe", email: "john@example.com", status: "active" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", status: "pending" },
  ];

  return (
    <CommonTable
      columns={columns}
      data={data}
      pagination={{
        currentPage: 1,
        totalPages: 1,
        rowsPerPage: 10,
        totalRecords: data.length,
        onPageChange: (page) => console.log(page),
        onRowsPerPageChange: (rows) => console.log(rows),
      }}
    />
  );
};
```

### Table with Custom Cell Rendering

```typescript
import { CommonTable } from "@/components/common";
import { Chip, Avatar } from "@heroui/react";

const AdvancedTable = () => {
  const columns = [
    { key: "doctor", label: "Doctor", width: "250px" },
    { key: "specialty", label: "Specialty" },
    { key: "status", label: "Status" },
  ];

  const data = [
    {
      id: 1,
      doctor: { name: "Dr. Smith", avatar: "url" },
      specialty: "Cardiology",
      status: "approved",
    },
  ];

  const renderCell = (columnKey: string, rowData: any) => {
    switch (columnKey) {
      case "doctor":
        return (
          <div className="flex items-center gap-2">
            <Avatar name={rowData.doctor.name} />
            <p>{rowData.doctor.name}</p>
          </div>
        );
      case "status":
        return (
          <Chip
            color={rowData.status === "approved" ? "success" : "warning"}
          >
            {rowData.status}
          </Chip>
        );
      default:
        return rowData[columnKey];
    }
  };

  return (
    <CommonTable
      columns={columns}
      data={data}
      renderCell={renderCell}
      pagination={{
        currentPage: 1,
        totalPages: 1,
        rowsPerPage: 10,
        totalRecords: data.length,
        onPageChange: () => {},
        onRowsPerPageChange: () => {},
      }}
    />
  );
};
```

### Table with Row Actions

```typescript
import { CommonTable, type TableRowAction } from "@/components/common";
import { FiEdit, FiTrash, FiEye } from "react-icons/fi";

const TableWithActions = () => {
  const columns = [{ key: "name", label: "Name" }];
  const data = [{ id: 1, name: "John" }];

  const rowActions: TableRowAction[] = [
    {
      id: "view",
      label: "View",
      icon: <FiEye size={18} />,
      onClick: (row) => console.log("View:", row),
    },
    {
      id: "edit",
      label: "Edit",
      icon: <FiEdit size={18} />,
      color: "primary",
      onClick: (row) => console.log("Edit:", row),
    },
    {
      id: "delete",
      label: "Delete",
      icon: <FiTrash size={18} />,
      color: "danger",
      confirmBeforeAction: true,
      confirmationMessage: "Are you sure you want to delete this record?",
      onClick: (row) => console.log("Delete:", row),
    },
  ];

  return (
    <CommonTable
      columns={columns}
      data={data}
      rowActions={rowActions}
      pagination={{
        currentPage: 1,
        totalPages: 1,
        rowsPerPage: 10,
        totalRecords: data.length,
        onPageChange: () => {},
        onRowsPerPageChange: () => {},
      }}
    />
  );
};
```

### Table with Row Selection

```typescript
import { CommonTable, createInitialSelectionState } from "@/components/common";
import { useState } from "react";

const TableWithSelection = () => {
  const [selectionState, setSelectionState] = useState(
    createInitialSelectionState()
  );

  const columns = [{ key: "name", label: "Name" }];
  const data = [
    { id: 1, name: "John" },
    { id: 2, name: "Jane" },
  ];

  return (
    <CommonTable
      columns={columns}
      data={data}
      rowSelection={{
        enabled: true,
        showCheckbox: true,
        state: selectionState,
        onChange: (newState) => setSelectionState(newState),
      }}
      pagination={{
        currentPage: 1,
        totalPages: 1,
        rowsPerPage: 10,
        totalRecords: data.length,
        onPageChange: () => {},
        onRowsPerPageChange: () => {},
      }}
    />
  );
};
```

## Props Reference

### Main Props (`CommonTableProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `TableColumn[]` | - | Column configuration array (required) |
| `data` | `T[]` | - | Table data rows (required) |
| `renderCell` | Function | - | Custom cell renderer function |
| `rowActions` | `TableRowAction[]` | `[]` | Row action buttons configuration |
| `pagination` | `PaginationConfig` | - | Pagination configuration |
| `rowSelection` | `RowSelectionConfig` | - | Row selection configuration |
| `state` | `TableStateConfig` | - | Loading, empty, error states |
| `sortDescriptor` | `SortDescriptor` | - | Current sort configuration |
| `onSortChange` | Function | - | Sort change callback |
| `showHeader` | `boolean` | `true` | Show/hide table header |
| `showFooter` | `boolean` | `true` | Show/hide pagination footer |
| `striped` | `boolean` | `true` | Alternating row colors |
| `hoverable` | `boolean` | `true` | Row hover effect |
| `dense` | `boolean` | `false` | Dense layout (reduced padding) |
| `showRowNumbers` | `boolean` | `false` | Show row numbers |
| `clickableRows` | `boolean` | `false` | Make rows clickable |
| `onRowClick` | Function | - | Row click handler |
| `responsive` | `boolean` | `true` | Mobile responsive layout |

### Column Configuration (`TableColumn`)

```typescript
interface TableColumn {
  key: string;                    // Unique column identifier
  label: string;                  // Display label
  sortable?: boolean;            // Allow sorting
  searchable?: boolean;          // Include in search
  width?: string;                // Fixed width
  minWidth?: string;             // Minimum width
  maxWidth?: string;             // Maximum width
  className?: string;            // Custom CSS classes
  align?: "left" | "center" | "right"; // Content alignment
  hideOnMobile?: boolean;        // Hide on mobile
}
```

### Row Action Configuration (`TableRowAction`)

```typescript
interface TableRowAction {
  id: string;                              // Unique action ID
  label: string;                           // Display label
  icon?: React.ReactNode;                 // Icon component
  color?: "default" | "primary" | "success" | "warning" | "danger";
  onClick: (rowData, rowIndex) => void;  // Action handler
  isDisabled?: (rowData, rowIndex) => boolean; // Disable condition
  confirmBeforeAction?: boolean;          // Show confirmation dialog
  confirmationMessage?: string;           // Confirmation message
  tooltip?: string;                       // Hover tooltip
  className?: string;                    // Custom CSS classes
}
```

### Pagination Configuration (`PaginationConfig`)

```typescript
interface PaginationConfig {
  currentPage: number;                          // Current page (1-indexed)
  totalPages: number;                           // Total pages
  rowsPerPage: number;                          // Rows per page
  totalRecords: number;                         // Total records
  onPageChange: (page: number) => void;        // Page change handler
  onRowsPerPageChange: (value: number) => void; // Rows per page change handler
  rowsPerPageOptions?: number[];               // Available page size options
  showPagination?: boolean;                    // Show pagination controls
  showRowsPerPage?: boolean;                   // Show rows per page selector
  showRowCount?: boolean;                      // Show record count info
}
```

### State Configuration (`TableStateConfig`)

```typescript
interface TableStateConfig {
  isLoading?: boolean;              // Loading state
  loadingMessage?: string;          // Loading message
  isEmpty?: boolean;                // Empty state
  emptyStateContent?: React.ReactNode; // Custom empty content
  emptyStateTitle?: string;         // Empty state title
  emptyStateDescription?: string;   // Empty state description
  renderEmptyState?: () => React.ReactNode; // Custom empty renderer
  hasError?: boolean;               // Error state
  errorMessage?: string;            // Error message
}
```

## Utility Functions

### Display and Formatting

```typescript
import {
  displayValue,           // Safe value display with fallback
  formatDate,            // Format dates to readable strings
  formatTime,            // Extract time from date
  truncateText,          // Truncate text with ellipsis
  getStatusLabel,        // Get formatted status label
  getStatusColor,        // Get status color for badges
} from "@/components/common";
```

### Data Manipulation

```typescript
import {
  getNestedValue,        // Get nested object properties
  sortByKey,            // Sort array by property
  filterBySearchTerm,   // Filter by search term
  getSearchableColumns, // Get searchable columns
  getSortableColumns,   // Get sortable columns
} from "@/components/common";
```

### Selection Management

```typescript
import {
  createInitialSelectionState, // Create empty selection state
  toggleRowSelection,          // Toggle row selection
  toggleSelectAll,             // Toggle select all
  getSelectedRowIndices,       // Get selected indices
  isRowSelected,              // Check if row is selected
} from "@/components/common";
```

## Migration Guide

### From ProfileRequestTable to CommonTable

The CommonTable component replaces the existing ProfileRequestTable. Here's how to migrate:

#### Before (ProfileRequestTable):

```typescript
import ProfileRequestTable from "@/components/ProfileRequestTable";
import { renderProfileRequestCell } from "@/components/ProfileRequestTableRenderer";

<ProfileRequestTable
  columns={columns}
  data={data}
  isLoading={isLoading}
  rowsPerPage={rowsPerPage}
  currentPage={currentPage}
  totalPages={totalPages}
  totalRecords={totalRecords}
  onPageChange={handlePageChange}
  onRowsPerPageChange={handleRowsPerPageChange}
  renderCell={(key, row) => renderProfileRequestCell({
    columnKey: key,
    rowData: row,
    displayValue,
    getStatusColor,
    getStatusLabel,
  })}
  rowActions={rowActions}
/>
```

#### After (CommonTable):

```typescript
import { CommonTable } from "@/components/common";

<CommonTable
  columns={columns}
  data={data}
  renderCell={renderProfileRequestCell}
  pagination={{
    currentPage,
    totalPages,
    rowsPerPage,
    totalRecords,
    onPageChange: handlePageChange,
    onRowsPerPageChange: handleRowsPerPageChange,
  }}
  state={{
    isLoading,
  }}
  rowActions={rowActions}
/>
```

## Best Practices

1. **Memoize Column Configurations** - Use `useMemo` for column definitions
   ```typescript
   const columns = useMemo(() => [...], [dependencies]);
   ```

2. **Optimize Cell Renderers** - Use `useCallback` for custom renderers
   ```typescript
   const renderCell = useCallback((columnKey, rowData) => {...}, []);
   ```

3. **Handle Large Datasets** - Use pagination to limit rendered rows
   ```typescript
   // Always paginate large datasets
   pagination={{ rowsPerPage: 25 }}
   ```

4. **Provide Feedback** - Use state configuration for loading/error states
   ```typescript
   state={{
     isLoading: data === null,
     hasError: error !== null,
   }}
   ```

5. **Accessibility** - Always include proper ARIA labels and keyboard support

## Accessibility

The CommonTable component includes:

- ✅ Semantic HTML with proper `role` attributes
- ✅ ARIA labels for screen readers
- ✅ Keyboard navigation support (Tab, Arrow keys, Enter)
- ✅ Focus management
- ✅ Color contrast compliance
- ✅ Alternative text for icons

## Performance Optimization

- Component is fully memoized with `React.memo`
- Callbacks are optimized with `useCallback`
- Computations are memoized with `useMemo`
- Re-renders are minimized through proper dependency arrays
- Virtual scrolling ready (can be added in future versions)

## Styling

The component uses Tailwind CSS classes and HeroUI components. Customize by:

1. **Override Default Classes** - Pass custom `className` prop
2. **Modify Constants** - Edit `src/components/common/constants.ts`
3. **Use Tailwind Config** - Modify `tailwind.config.ts`

## Examples

See the following pages for real-world usage:

- **Profile Request Page** - `src/pages/dashboard/superadmin/ProfileRequest.tsx`
- (More examples coming as pages are migrated)

## Troubleshooting

### Table Not Rendering

- Check that `columns` and `data` props are provided
- Verify `pagination` configuration is complete

### Custom Rendering Not Working

- Ensure `renderCell` callback returns valid React nodes
- Check column keys match data object keys

### Selection Not Working

- Verify `rowSelection.enabled` is set to `true`
- Check that selection state is properly managed

### Performance Issues

- Implement pagination for large datasets
- Memoize expensive computations in cell renderers
- Consider virtual scrolling for datasets > 1000 rows

## Contributing

When extending the CommonTable component:

1. Add new features to appropriate sub-component
2. Update types in `types.ts`
3. Add utilities to `utils.ts`
4. Update constants in `constants.ts`
5. Add comprehensive JSDoc comments
6. Test across different browsers
7. Verify accessibility compliance

## License

Part of the MediSetu application. All rights reserved.
