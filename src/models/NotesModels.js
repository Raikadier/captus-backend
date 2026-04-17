export default class Note {
  constructor({
    id = null,
    created_at = new Date(),
    update_at = new Date(),
    user_id,
    title,
    content = null,
    subject = null,
    is_pinned = false,
  }) {
    this.id = id;
    this.created_at = created_at;
    this.update_at = update_at;
    this.user_id = user_id;
    this.title = title;
    this.content = content;
    this.subject = subject;
    this.is_pinned = is_pinned;
  }
}