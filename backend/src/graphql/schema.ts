// GraphQL Schema Definition
// Based on docs/API.md

export const typeDefs = `#graphql
  # ========================================
  # Custom Scalars
  # ========================================

  scalar DateTime
  scalar BigInt
  scalar Upload

  # ========================================
  # Enums
  # ========================================

  enum UserRole {
    ADMIN
    USER
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

  # ========================================
  # Types
  # ========================================

  type User {
    id: ID!
    email: String!
    displayName: String
    role: UserRole!
    safeModeOnly: Boolean!
    createdAt: DateTime!
  }

  type OTPSession {
    email: String!
    expiresAt: DateTime!
    message: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

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

    # Transcoding
    transcoded: Boolean!
    transcodedPath: String
    transcodeStatus: TranscodeStatus!

    # Tags
    tags: [Tag!]!

    # User-specific (based on current user)
    isFavorited: Boolean!
    watchProgress: WatchProgress

    # Stats
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

  type Tag {
    id: ID!
    namespace: String!
    value: String!
    createdAt: DateTime!

    """
    Media count (filtered by user permissions)
    - Regular users: Only counts SFW media
    - Admins: Counts all media
    """
    mediaCount: Int!
  }

  type WatchProgress {
    id: ID!
    user: User!
    media: Media!
    progressSeconds: Int!
    completed: Boolean!
    updatedAt: DateTime!
  }

  # ========================================
  # Input Types
  # ========================================

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

  # ========================================
  # Queries
  # ========================================

  type Query {
    # Auth
    """Get current logged-in user"""
    me: User!

    # Media
    """Get single media by ID"""
    media(id: ID!): Media

    """Get media list with filtering, sorting, and pagination"""
    mediaList(
      filter: MediaFilter
      sort: MediaSort
      page: Int = 1
      limit: Int = 20
    ): MediaConnection!

    """Search media (full-text search)"""
    searchMedia(
      query: String!
      type: MediaType
      page: Int = 1
      limit: Int = 20
    ): MediaConnection!

    # Tags
    """
    Get all tags (optionally filtered by namespace)

    Permission filtering:
    - Regular users: Only returns tags with at least one SFW media
    - Admins: Returns all tags (including NSFW-only tags)
    """
    tags(namespace: String): [Tag!]!

    """
    Get tag suggestions (autocomplete)

    Permission filtering:
    - Regular users: Only returns tags with SFW media
    - Admins: Returns all tags
    """
    tagSuggestions(namespace: String!, prefix: String!): [Tag!]!

    # Favorites & Watch Progress
    """Get favorites list"""
    favorites(
      type: MediaType
      page: Int = 1
      limit: Int = 20
    ): MediaConnection!

    """Get continue watching list (has progress but not completed)"""
    continueWatching(limit: Int = 10): [Media!]!
  }

  # ========================================
  # Mutations
  # ========================================

  type Mutation {
    # Auth
    """Send OTP to email"""
    requestOTP(email: String!): OTPSession!

    """Verify OTP and login"""
    verifyOTP(email: String!, code: String!): AuthPayload!

    """Logout"""
    logout: Boolean!

    # Tags (Admin only)
    """Add tag to media (Admin only)"""
    addTagToMedia(mediaId: ID!, tagId: ID!): Media!

    """Remove tag from media (Admin only)"""
    removeTagFromMedia(mediaId: ID!, tagId: ID!): Media!

    """Create new tag (Admin only)"""
    createTag(namespace: String!, value: String!): Tag!

    """Delete tag (Admin only)"""
    deleteTag(id: ID!): Boolean!

    # Favorites & Watch Progress
    """Toggle favorite status"""
    toggleFavorite(mediaId: ID!): Media!

    """Update watch progress"""
    updateWatchProgress(mediaId: ID!, progressSeconds: Int!): WatchProgress!

    """Mark as completed"""
    markAsCompleted(mediaId: ID!): WatchProgress!
  }
`
