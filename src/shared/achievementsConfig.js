export const achievements = {
  // LOGROS FÁCILES
  "first_task": {
    name: "Primer Paso",
    description: "Completaste tu primera tarea",
    icon: "🎯",
    difficulty: "easy",
    targetValue: 1,
    type: "completed_tasks",
    color: "#4CAF50"
  },
  "prioritario": {
    name: "Prioritario",
    description: "Creaste tu primera tarea de prioridad alta",
    icon: "⭐",
    difficulty: "easy",
    targetValue: 1,
    type: "high_priority_tasks",
    color: "#4CAF50"
  },
  "subdivisor": {
    name: "Subdivisor",
    description: "Creaste tu primera subtarea",
    icon: "📝",
    difficulty: "easy",
    targetValue: 1,
    type: "subtasks_created",
    color: "#4CAF50"
  },
  "explorador": {
    name: "Explorador",
    description: "Creaste 5 tareas diferentes",
    icon: "🗺️",
    difficulty: "easy",
    targetValue: 5,
    type: "tasks_created",
    color: "#4CAF50"
  },

  // LOGROS MEDIOS
  "productivo": {
    name: "Productivo",
    description: "Completaste 25 tareas totales",
    icon: "⚡",
    difficulty: "medium",
    targetValue: 25,
    type: "completed_tasks",
    color: "#FF9800"
  },
  "consistente": {
    name: "Consistente",
    description: "Mantuviste una racha de 3 días",
    icon: "🔥",
    difficulty: "medium",
    targetValue: 3,
    type: "streak",
    color: "#FF9800"
  },
  "tempranero": {
    name: "Tempranero",
    description: "Completaste 3 tareas antes de las 9 AM",
    icon: "🌅",
    difficulty: "medium",
    targetValue: 3,
    type: "early_tasks",
    color: "#FF9800"
  },
  "multitarea": {
    name: "Multitarea",
    description: "Completaste 5 subtareas en una tarea padre",
    icon: "🎪",
    difficulty: "medium",
    targetValue: 5,
    type: "subtasks_completed",
    color: "#FF9800"
  },

  // LOGROS DIFÍCILES
  "maraton": {
    name: "Maratón",
    description: "Completaste 100 tareas totales",
    icon: "🏃",
    difficulty: "hard",
    targetValue: 100,
    type: "completed_tasks",
    color: "#F44336"
  },
  "leyenda": {
    name: "Leyenda",
    description: "Mantuviste una racha de 30 días",
    icon: "👑",
    difficulty: "hard",
    targetValue: 30,
    type: "streak",
    color: "#F44336"
  },
  "velocista": {
    name: "Velocista",
    description: "Completaste 10 tareas en un día",
    icon: "💨",
    difficulty: "hard",
    targetValue: 10,
    type: "tasks_in_day",
    color: "#F44336"
  },
  "perfeccionista": {
    name: "Perfeccionista",
    description: "Completaste 50 tareas sin subtareas",
    icon: "🎯",
    difficulty: "hard",
    targetValue: 50,
    type: "solo_tasks",
    color: "#F44336"
  },

  // LOGROS ESPECIALES
  "dominguero": {
    name: "Dominguero",
    description: "Completaste 5 tareas en domingo",
    icon: "⛱️",
    difficulty: "special",
    targetValue: 5,
    type: "sunday_tasks",
    color: "#9C27B0"
  },
  "maestro": {
    name: "Maestro",
    description: "Completaste 500 tareas totales",
    icon: "🎓",
    difficulty: "special",
    targetValue: 500,
    type: "completed_tasks",
    color: "#9C27B0"
  },

  // LOGROS ÉPICOS
  "inmortal": {
    name: "Inmortal",
    description: "Mantuviste una racha de 100 días",
    icon: "⚡",
    difficulty: "epic",
    targetValue: 100,
    type: "streak",
    color: "#673AB7"
  },
  "titan": {
    name: "Titán",
    description: "Completaste 1000 tareas totales",
    icon: "🏔️",
    difficulty: "epic",
    targetValue: 1000,
    type: "completed_tasks",
    color: "#673AB7"
  },
  "dios_productividad": {
    name: "Dios de la Productividad",
    description: "Completaste 5000 tareas totales",
    icon: "👑",
    difficulty: "epic",
    targetValue: 5000,
    type: "completed_tasks",
    color: "#673AB7"
  }
};

// Sistema de motivación por racha
export const motivationalMessages = {
  0: [
    "¡Empieza tu racha hoy!",
    "Cada pequeño paso cuenta",
    "¡El momento perfecto para comenzar!",
    "¡Tu primera racha te espera!"
  ],
  "1-2": [
    "¡Vas por buen camino!",
    "¡Sigue así, estás en racha!",
    "¡Dos días seguidos, impresionante!",
    "¡La consistencia es tu aliada!"
  ],
  "3-6": [
    "¡Eres imparable!",
    "¡Mantén el ritmo!",
    "¡Estás en llamas!",
    "¡Tu dedicación se nota!"
  ],
  "7-14": [
    "¡Campeón de la productividad!",
    "¡Eres una máquina!",
    "¡Leyenda en acción!",
    "¡Tu racha es inspiradora!"
  ],
  "15-29": [
    "¡Eres un titán!",
    "¡Racha legendaria!",
    "¡Imparable como un huracán!",
    "¡Tu constancia es admirable!"
  ],
  "30+": [
    "¡Dios de la productividad!",
    "¡Racha inmortal!",
    "¡Eres una leyenda viva!",
    "¡Tu dedicación no tiene límites!"
  ]
};

// Función helper para obtener mensaje motivacional
export function getMotivationalMessage(streak) {
  if (streak === 0) return motivationalMessages[0];
  if (streak >= 1 && streak <= 2) return motivationalMessages["1-2"];
  if (streak >= 3 && streak <= 6) return motivationalMessages["3-6"];
  if (streak >= 7 && streak <= 14) return motivationalMessages["7-14"];
  if (streak >= 15 && streak <= 29) return motivationalMessages["15-29"];
  return motivationalMessages["30+"];
}