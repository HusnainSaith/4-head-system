// Additional permission actions you might want to add
export enum PermissionActionEnum {
  // Basic CRUD
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',

  // Advanced Actions
  APPROVE = 'approve', // For approval workflows
  REJECT = 'reject', // For rejection workflows
  PUBLISH = 'publish', // For content publishing
  ARCHIVE = 'archive', // For archiving items
  RESTORE = 'restore', // For restoring archived items
  POST = 'post', // Post transactions
  REVERSE = 'reverse', // Reverse transactions
  ADJUST = 'adjust', // Adjust inventory
  TRANSFER = 'transfer', // Transfer resources

  // Bulk Operations
  BULK_CREATE = 'bulk_create',
  BULK_UPDATE = 'bulk_update',
  BULK_DELETE = 'bulk_delete',
  IMPORT = 'import',
  EXPORT = 'export',

  // Assignment/Management
  ASSIGN = 'assign', // Assign resources to others
  UNASSIGN = 'unassign', // Remove assignments
  MANAGE = 'manage', // Full management access

  // Viewing/Access Control
  VIEW_ALL = 'view_all', // View all items in resource
  VIEW_OWN = 'view_own', // View only own items
  VIEW_TEAM = 'view_team', // View team items

  // Reporting & Analytics
  REPORT = 'report', // Generate reports
  ANALYZE = 'analyze', // Access analytics

  // System Administration
  CONFIGURE = 'configure', // Configure settings
  BACKUP = 'backup', // Create backups
  RESTORE_BACKUP = 'restore_backup', // Restore from backup

  // Custom Actions
  CONVERT = 'convert', // Convert resource types
  MERGE = 'merge', // Merge multiple resources
  RESPOND = 'respond', // Respond to requests or messages
  RESOLVE = 'resolve', // Resolve issues or tickets
  CLOSE = 'close', // Close items or tickets
  ESCALATE = 'escalate', // Escalate issues or tickets
  MONITOR = 'monitor', // Monitor ongoing processes or issues
  AUDIT = 'audit', // Perform audits on resources
}
