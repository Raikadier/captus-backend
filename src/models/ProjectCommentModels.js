class ProjectComment {
  constructor({
    id_Comment = null,
    id_Project,
    id_User,
    id_ParentComment = null,
    content,
    createdAt = new Date(),
  }) {
    this.id_Comment = id_Comment;             
    this.id_Project = id_Project;             
    this.id_User = id_User;                   
    this.id_ParentComment = id_ParentComment; 
    this.content = content;                   
    this.createdAt = createdAt;               
  }
}

export default ProjectComment;
