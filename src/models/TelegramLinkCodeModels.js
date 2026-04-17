import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TelegramLinkCode = sequelize.define('TelegramLinkCode', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'telegram_link_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

export default TelegramLinkCode;
