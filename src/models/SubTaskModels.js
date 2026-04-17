export default class SubTask {
  constructor({
    id_SubTask = null,
    title,
    id_Category,
    description = null,
    creationDate = new Date(),
    endDate,
    id_Priority,
    state = false,
    id_Task = null,
  }) {
    this.id_SubTask = id_SubTask;
    this.title = title;
    this.id_Category = id_Category;
    this.description = description;
    this.creationDate = creationDate;
    this.endDate = endDate;
    this.id_Priority = id_Priority;
    this.state = state;
    this.id_Task = id_Task;
  }
}
