from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Item(models.Model):
    CONDITION_CHOICES = [
        ("mint", "Mint"),
        ("near_mint", "Near mint"),
        ("good", "Good"),
        ("fair", "Fair"),
    ]

    name = models.CharField(max_length=160)
    category = models.ForeignKey(
        Category,
        related_name="items",
        on_delete=models.PROTECT,
    )
    description = models.TextField(blank=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default="good")
    price = models.DecimalField(max_digits=8, decimal_places=2)
    stock = models.PositiveIntegerField(default=1)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
