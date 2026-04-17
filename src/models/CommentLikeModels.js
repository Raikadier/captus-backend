// CommentLikeModels.js
class CommentLike {
  constructor({
    id_Like = null,
    id_User,
    id_Comment,
    createdAt = new Date(),
  }) {
    this.id_Like = id_Like;       
    this.id_User = id_User;       
    this.id_Comment = id_Comment; 
    this.createdAt = createdAt;  
  }
}

export default CommentLike;
