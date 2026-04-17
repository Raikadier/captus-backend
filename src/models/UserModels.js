export default class User {
  constructor({
    id = null, // Matches Supabase/DB 'id'
    email,
    name = null,
    role = 'student',
    created_at = null,
    updated_at = null,
    carrer = null,
    bio = null,
    avatar_url = null
  }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.role = role;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.carrer = carrer;
    this.bio = bio;
    this.avatar_url = avatar_url;
  }

  static fromDatabase(row) {
    return new User({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || 'student', // Fallback if column is missing momentarily
      created_at: row.created_at,
      updated_at: row.updated_at,
      carrer: row.carrer,
      bio: row.bio,
      avatar_url: row.avatar_url
    });
  }

  static fromSupabaseAuth(authUser) {
    const metadata = authUser.user_metadata || {};
    return new User({
      id: authUser.id,
      email: authUser.email,
      name: metadata.name || metadata.full_name,
      role: metadata.role || 'student',
      created_at: authUser.created_at,
      updated_at: authUser.updated_at || new Date(),
      avatar_url: metadata.avatar_url || metadata.picture
    });
  }

  toDatabase() {
    const dbObj = {
      id: this.id,
      email: this.email,
      name: this.name,
      updated_at: new Date(),
      // We intentionally include 'role' here so it gets saved when we add the column
      role: this.role
    };

    // Optional fields - only add if they have values to avoid overwriting with null if not intended
    // However, for a sync, we might want to be explicit.
    // Let's keep it simple:
    if (this.carrer) dbObj.carrer = this.carrer;
    if (this.bio) dbObj.bio = this.bio;
    if (this.avatar_url) dbObj.avatar_url = this.avatar_url;

    return dbObj;
  }

  validate() {
    const errors = [];
    if (!this.email) errors.push('Email is required');
    if (!this.id) errors.push('User ID is required');
    // Role validation could be added here
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
