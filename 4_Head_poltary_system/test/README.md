# LabVerse API Test Suite

This directory contains comprehensive test cases for all modules in the LabVerse API project.

## Test Structure

```
test/
├── modules/                    # Module-specific tests
│   ├── auth/                  # Authentication tests
│   ├── users/                 # User management tests
│   ├── roles/                 # Role management tests
│   ├── hr/                    # HR module tests
│   ├── project-management/    # Project management tests
│   ├── billing/               # Billing system tests
│   ├── crm/                   # CRM module tests
│   ├── content/               # Content management tests
│   ├── messaging/             # Messaging system tests
│   ├── support-tickets/       # Support ticket tests
│   └── ...                    # Other modules
├── integration/               # Integration tests
├── utils/                     # Test utilities and helpers
└── jest.config.js            # Jest configuration
```

## Running Tests

### Unit Tests

```bash
# Run all module tests
npm run test:modules

# Run specific module tests
npm run test:modules -- --testPathPattern=auth

# Run with coverage
npm run test:modules -- --coverage

# Run in watch mode
npm run test:modules -- --watch
```

### Integration Tests

```bash
# Run integration tests
npm run test:modules -- --testPathPattern=integration
```

## Test Coverage

The test suite covers:

- **Authentication & Authorization**: Login, registration, JWT tokens, refresh tokens
- **User Management**: CRUD operations, role assignments
- **Project Management**: Projects, tasks, time tracking, milestones
- **HR Management**: Employee profiles, skills, assignments
- **CRM**: Client management, leads, interactions
- **Billing**: Invoices, payments, quotations
- **Content Management**: Blog posts, Q&A, case studies
- **Communication**: Messaging, support tickets
- **Development Plans**: Service plans, features, technologies

## Test Patterns

### Service Tests

- Mock repository dependencies
- Test business logic
- Validate error handling
- Check return values

### Controller Tests

- Mock service dependencies
- Test HTTP endpoints
- Validate request/response handling
- Check authentication/authorization

### Integration Tests

- Test complete request/response cycles
- Validate database interactions
- Test authentication flows
- Check API contracts

## Mocking Strategy

- **Repositories**: Mocked using `mockRepository()` helper
- **External Services**: Mocked with Jest functions
- **Database**: In-memory database for integration tests
- **Authentication**: Mocked JWT service

## Best Practices

1. **Isolation**: Each test is independent
2. **Mocking**: External dependencies are mocked
3. **Coverage**: Aim for >80% code coverage
4. **Naming**: Descriptive test names
5. **Structure**: Arrange-Act-Assert pattern
