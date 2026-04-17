import enum

from tortoise import Tortoise, fields
from tortoise.models import Model


class User(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True)
    password = fields.CharField(max_length=255)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "users"


class Project(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.CharField(max_length=1000, null=True)
    owner_id = fields.IntField()
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "projects"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Task(Model):
    id = fields.IntField(pk=True)
    title = fields.CharField(max_length=255)
    description = fields.CharField(max_length=2000, null=True)
    status = fields.CharField(max_length=20, default=TaskStatus.TODO.value)
    priority = fields.CharField(max_length=20, default=TaskPriority.MEDIUM.value)
    project_id = fields.IntField()
    assignee_id = fields.IntField(null=True)
    due_date = fields.DateField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "tasks"