# Bookmark/Link Management API — Product Specification

## Overview

Build a REST API for managing bookmarks (saved links). Users can create, organize,
search, and import/export their bookmarks. The API uses a SQLite database for
persistence and runs as a standalone Express.js server.

---

## Data Model

### Bookmark

| Field       | Type     | Description                          |
|-------------|----------|--------------------------------------|
| id          | INTEGER  | Auto-incrementing primary key        |
| url         | TEXT     | The bookmark URL (required, valid URL) |
| title       | TEXT     | Title/name of the bookmark (required) |
| description | TEXT     | Optional description                 |
| tags        | TEXT     | JSON array of tag strings            |
| createdAt   | TEXT     | ISO 8601 timestamp, set on creation  |
| updatedAt   | TEXT     | ISO 8601 timestamp, updated on mutation |

Tags are stored as a JSON array in the database (e.g., `["javascript", "tutorial"]`).
When returned in API responses, they should be deserialized into a proper array.

---

## API Endpoints

### POST /api/bookmarks — Create Bookmark

**Request body:**
```json
{
  "url": "https://example.com/article",
  "title": "Interesting Article",
  "description": "An article about interesting things",
  "tags": ["reading", "tech"]
}
```

**Validation:**
- `url` is required and must be a valid URL
- `title` is required and must be a non-empty string
- `description` is optional, defaults to empty string
- `tags` is optional, defaults to empty array. Each tag must be a non-empty string.

**Response:** `201 Created` with the created bookmark object.

---

### GET /api/bookmarks — List Bookmarks

**Query parameters:**
- `tag` (optional) — Filter bookmarks that contain this tag
- `search` (optional) — Full-text search across title and description (case-insensitive substring match)

If both `tag` and `search` are provided, return bookmarks matching BOTH criteria.

**Response:** `200 OK` with array of bookmark objects.

---

### GET /api/bookmarks/:id — Get Bookmark

**Response:** `200 OK` with bookmark object, or `404` if not found.

---

### PUT /api/bookmarks/:id — Update Bookmark

**Request body:** Same shape as POST, but all fields are optional. Only provided
fields are updated. `updatedAt` is refreshed automatically.

**Validation:** Same rules as POST for any provided fields.

**Response:** `200 OK` with the updated bookmark object, or `404` if not found.

---

### DELETE /api/bookmarks/:id — Delete Bookmark

**Response:** `204 No Content` on success, or `404` if not found.

---

### POST /api/bookmarks/import — Import Bookmarks

**Request body:** JSON array of bookmark objects (same shape as POST body).

```json
[
  { "url": "https://example.com", "title": "Example", "tags": ["test"] },
  { "url": "https://other.com", "title": "Other Site" }
]
```

**Validation:** Each bookmark in the array is validated individually. If any bookmark
fails validation, the entire import is rejected (atomic operation).

**Response:** `201 Created` with `{ "imported": <count> }` on success, or `400` with
details of validation errors.

---

### GET /api/bookmarks/export — Export Bookmarks

**Response:** `200 OK` with JSON array of all bookmark objects. The response should
set `Content-Type: application/json`.

---

### GET /api/stats — Statistics

**Response:** `200 OK` with:
```json
{
  "total": 42,
  "topTags": [
    { "tag": "javascript", "count": 15 },
    { "tag": "tutorial", "count": 12 }
  ],
  "bookmarksPerDay": [
    { "date": "2025-01-15", "count": 3 },
    { "date": "2025-01-14", "count": 7 }
  ]
}
```

- `total`: Total number of bookmarks
- `topTags`: Top 10 most used tags, sorted by count descending
- `bookmarksPerDay`: Number of bookmarks created per day for the last 30 days
  (only include days with at least 1 bookmark)

---

## Technical Requirements

1. **Framework**: Express.js
2. **Database**: SQLite via `better-sqlite3` — no external database server needed
3. **Schema setup**: The database schema should be created automatically on startup
   if the tables do not exist
4. **Input validation**: All endpoints must validate input and return `400 Bad Request`
   with a descriptive error message for invalid input
5. **Error handling**: Global error handling middleware that catches unhandled errors
   and returns `500 Internal Server Error` with a generic message (do not leak stack
   traces in responses)
6. **Testing**: At least 15 integration tests using `jest` and `supertest`
7. **Code organization**: Separate concerns — routes, database logic, validation,
   middleware should be in separate modules

---

## Error Response Format

All error responses should follow this shape:

```json
{
  "error": "Description of what went wrong"
}
```

---

## Notes

- No authentication required for this API
- No pagination required for list endpoints (return all matching results)
- The database file path should be configurable via the `DATABASE_PATH` environment
  variable (default: `./data/bookmarks.db`)
- The server port should be configurable via the `PORT` environment variable
  (default: 3000)
