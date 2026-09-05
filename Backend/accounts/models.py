from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    role = models.CharField(max_length=20)

    class Meta:
        managed = True
        db_table = "accounts_user"
        