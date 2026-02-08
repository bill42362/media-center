# GraphQL API 文件

本文件定義 Media Center 的 GraphQL API 介面，包含所有 Query、Mutation 和型別定義。

---

## 目錄

1. [認證相關](#認證相關)
2. [媒體查詢](#媒體查詢)
3. [標籤管理](#標籤管理)
4. [最愛與觀看進度](#最愛與觀看進度)
5. [型別定義](#型別定義)
6. [權限說明](#權限說明)

---

## 認證相關

### Query

```graphql
type Query {
  """取得當前登入的使用者資訊"""
  me: User!
}
```

### Mutation

```graphql
type Mutation {
  """發送 OTP 到指定 Email"""
  requestOTP(email: String!): OTPSession!

  """驗證 OTP 並登入"""
  verifyOTP(email: String!, code: String!): AuthPayload!

  """登出"""
  logout: Boolean!
}
```

### 型別定義

```graphql
type OTPSession {
  email: String!
  expiresAt: DateTime!
  message: String!
}

type AuthPayload {
  token: String!
  user: User!
}

type User {
  id: ID!
  email: String!
  displayName: String
  role: UserRole!
  safeModeOnly: Boolean!
  createdAt: DateTime!
}

enum UserRole {
  ADMIN
  USER
}
```

### 使用範例

```graphql
# 1. 請求 OTP
mutation {
  requestOTP(email: "user@example.com") {
    email
    expiresAt
    message
  }
}

# 2. 驗證 OTP 並登入
mutation {
  verifyOTP(email: "user@example.com", code: "123456") {
    token
    user {
      id
      email
      displayName
      role
    }
  }
}

# 3. 查詢當前使用者
query {
  me {
    id
    email
    role
    safeModeOnly
  }
}
```

---

## 媒體查詢

### Query

```graphql
type Query {
  """取得單一媒體詳細資訊"""
  media(id: ID!): Media

  """取得媒體列表（支援分頁、篩選、排序）"""
  mediaList(
    filter: MediaFilter
    sort: MediaSort
    page: Int = 1
    limit: Int = 20
  ): MediaConnection!

  """搜尋媒體（全文搜尋）"""
  searchMedia(
    query: String!
    type: MediaType
    page: Int = 1
    limit: Int = 20
  ): MediaConnection!
}
```

### Input 型別

```graphql
input MediaFilter {
  type: MediaType
  tagIds: [ID!]
  isFavorited: Boolean
  hasProgress: Boolean
  safeMode: Boolean
}

input MediaSort {
  field: MediaSortField!
  order: SortOrder!
}

enum MediaSortField {
  CREATED_AT
  TITLE
  VIEW_COUNT
  DURATION
}

enum SortOrder {
  ASC
  DESC
}
```

### 型別定義

```graphql
type Media {
  id: ID!
  type: MediaType!
  title: String!
  filePath: String!
  fileSize: BigInt!
  duration: Int
  width: Int
  height: Int
  thumbnailPath: String

  # 轉碼相關
  transcoded: Boolean!
  transcodedPath: String
  transcodeStatus: TranscodeStatus!

  # 標籤
  tags: [Tag!]!

  # 使用者相關（依當前登入使用者）
  isFavorited: Boolean!
  watchProgress: WatchProgress

  # 統計
  viewCount: Int!
  lastViewedAt: DateTime

  createdAt: DateTime!
  updatedAt: DateTime!
}

type MediaConnection {
  edges: [MediaEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type MediaEdge {
  node: Media!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

enum MediaType {
  VIDEO
  IMAGE
  ARTICLE
}

enum TranscodeStatus {
  PENDING
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}
```

### 使用範例

```graphql
# 取得影片列表（僅 SFW，最新優先）
query {
  mediaList(
    filter: { type: VIDEO, safeMode: true }
    sort: { field: CREATED_AT, order: DESC }
    page: 1
    limit: 20
  ) {
    edges {
      node {
        id
        title
        duration
        thumbnailPath
        tags {
          id
          namespace
          value
        }
        isFavorited
        watchProgress {
          progressSeconds
          completed
        }
      }
    }
    pageInfo {
      hasNextPage
      totalCount
    }
  }
}

# 搜尋影片
query {
  searchMedia(query: "星際大戰", type: VIDEO) {
    edges {
      node {
        id
        title
        tags {
          namespace
          value
        }
      }
    }
  }
}
```

---

## 標籤管理

### Query

```graphql
type Query {
  """取得所有標籤（可按 namespace 篩選）"""
  tags(namespace: String): [Tag!]!

  """取得標籤建議（自動補全）"""
  tagSuggestions(namespace: String!, prefix: String!): [Tag!]!
}
```

### Mutation

```graphql
type Mutation {
  """新增標籤到媒體（僅管理員）"""
  addTagToMedia(mediaId: ID!, tagId: ID!): Media!

  """從媒體移除標籤（僅管理員）"""
  removeTagFromMedia(mediaId: ID!, tagId: ID!): Media!

  """建立新標籤（僅管理員）"""
  createTag(namespace: String!, value: String!): Tag!

  """刪除標籤（僅管理員）"""
  deleteTag(id: ID!): Boolean!
}
```

### 型別定義

```graphql
type Tag {
  id: ID!
  namespace: String!
  value: String!
  createdAt: DateTime!

  # 統計
  mediaCount: Int!
}
```

### 使用範例

```graphql
# 取得所有作者標籤
query {
  tags(namespace: "author") {
    id
    namespace
    value
    mediaCount
  }
}

# 標籤自動補全
query {
  tagSuggestions(namespace: "director", prefix: "Ang") {
    id
    value
  }
}

# 新增標籤到影片
mutation {
  addTagToMedia(
    mediaId: "media-123"
    tagId: "tag-456"
  ) {
    id
    tags {
      namespace
      value
    }
  }
}
```

---

## 最愛與觀看進度

### Mutation

```graphql
type Mutation {
  """切換最愛狀態"""
  toggleFavorite(mediaId: ID!): Media!

  """更新觀看進度"""
  updateWatchProgress(
    mediaId: ID!
    progressSeconds: Int!
  ): WatchProgress!

  """標記為已完成"""
  markAsCompleted(mediaId: ID!): WatchProgress!
}
```

### Query

```graphql
type Query {
  """取得最愛列表"""
  favorites(
    type: MediaType
    page: Int = 1
    limit: Int = 20
  ): MediaConnection!

  """取得繼續觀看列表（有進度但未完成）"""
  continueWatching(limit: Int = 10): [Media!]!
}
```

### 型別定義

```graphql
type WatchProgress {
  id: ID!
  user: User!
  media: Media!
  progressSeconds: Int!
  completed: Boolean!
  updatedAt: DateTime!
}
```

### 使用範例

```graphql
# 加入/移除最愛
mutation {
  toggleFavorite(mediaId: "media-123") {
    id
    isFavorited
  }
}

# 更新觀看進度（每 30 秒）
mutation {
  updateWatchProgress(
    mediaId: "media-123"
    progressSeconds: 1234
  ) {
    progressSeconds
    completed
    updatedAt
  }
}

# 取得繼續觀看列表
query {
  continueWatching(limit: 5) {
    id
    title
    thumbnailPath
    watchProgress {
      progressSeconds
      completed
    }
  }
}
```

---

## 型別定義

### 自訂標量

```graphql
scalar DateTime
scalar BigInt
scalar Upload
```

### 錯誤處理

所有 API 錯誤使用標準 GraphQL 錯誤格式：

```json
{
  "errors": [
    {
      "message": "未授權",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

常見錯誤代碼：
- `UNAUTHENTICATED` - 未登入
- `FORBIDDEN` - 權限不足
- `NOT_FOUND` - 資源不存在
- `BAD_USER_INPUT` - 輸入驗證失敗
- `INTERNAL_SERVER_ERROR` - 伺服器錯誤

---

## 權限說明

### 無需登入
- 無（所有 API 都需要登入）

### 一般使用者
- ✅ 查詢媒體列表（僅 SFW）
- ✅ 查詢單一媒體
- ✅ 搜尋媒體
- ✅ 查詢標籤
- ✅ 切換最愛（有數量限制）
- ✅ 更新觀看進度
- ❌ 上傳媒體
- ❌ 編輯標籤
- ❌ 切換安全模式

### 管理員
- ✅ 所有一般使用者權限
- ✅ 查詢所有媒體（包含 NSFW）
- ✅ 上傳媒體
- ✅ 編輯標籤
- ✅ 切換安全模式
- ✅ 查看所有使用者的觀看紀錄

### 權限檢查方式

在 GraphQL Context 中包含當前使用者資訊：

```typescript
interface Context {
  user?: User;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSafeMode: boolean;
}
```

---

## Subscriptions（未來階段）

```graphql
type Subscription {
  """轉碼進度更新"""
  transcodeProgress(mediaId: ID!): TranscodeProgress!

  """新媒體通知"""
  newMediaAdded: Media!
}

type TranscodeProgress {
  mediaId: ID!
  resolution: String!
  progress: Int!
  status: TranscodeStatus!
}
```

---

## 附註

- 所有 DateTime 使用 ISO 8601 格式
- 分頁預設 20 筆，最大 100 筆
- 標籤搜尋支援模糊比對
- 觀看進度每 30 秒自動更新一次
- 最愛列表變更會觸發轉碼任務（如果尚未轉碼）
