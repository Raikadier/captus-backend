export default class Event {
  constructor({
    id = null,
    user_id,
    title,
    description = null,
    start_date,
    end_date = null,
    created_at = new Date(),
    updated_at = new Date(),
    type,
    is_past = false,
    notify = false,
    metadata = null,
  }) {
    this.id = id;
    this.user_id = user_id;
    this.title = title;
    this.description = description;
    this.start_date = start_date;
    this.end_date = end_date;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.type = type;
    this.is_past = is_past;
    this.notify = notify;
    this.metadata = metadata;
  }
}