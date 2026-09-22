# 4Head Poultry ERP Desktop

Build the self-contained Windows portable executable:

```powershell
npm.cmd run dist
```

The executable is written to `release/`. On first launch it creates a private
PostgreSQL database under the current Windows user's application-data folder,
runs migrations, and seeds the initial owner account.

Initial login:

- Email: `admin@poultry.local`
- Password: `Admin@123`

Change the password immediately after the first login.
