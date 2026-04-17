export default class Task {
  constructor({
    id_Task = null,
    title,
    id_Category,
    description = null,
    creationDate = new Date(),
    endDate,
    id_Priority,
    state = false,
    id_User,
  }) {
    this.id_Task = id_Task;
    this.title = title;
    this.id_Category = id_Category;
    this.description = description;
    this.creationDate = creationDate;
    this.endDate = endDate;
    this.id_Priority = id_Priority;
    this.state = state;
    this.id_User = id_User;
  }
}

