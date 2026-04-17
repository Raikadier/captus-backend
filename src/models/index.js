import User from "./UserModels.js";
import Project from "./ProjectModels.js";
import ProjectMember from "./ProjectMembersModels.js";
import ProjectComment from "./ProjectCommentModels.js";
import Rol from "./RolModels.js";
import CommentLike from "./CommentLikeModels.js";
import Category from "./CategoryModels.js";
import Priority from "./PriorityModels.js";
import Task from "./TaskModels.js";
import SubTask from "./SubTaskModels.js";
import Statistics from "./StatisticsModels.js";
import UserAchievements from "./UserAchievementsModels.js";

const models = {
  User,
  Project,
  ProjectMember,
  ProjectComment,
  Rol,
  CommentLike,
  Category,
  Priority,
  Task,
  SubTask,
  Statistics,
  UserAchievements
};

export default models;
