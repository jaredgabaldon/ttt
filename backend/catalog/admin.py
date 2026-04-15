from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Item


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "condition", "price", "stock", "is_featured", "image_preview"]
    list_filter = ["category", "condition", "is_featured"]
    search_fields = ["name", "description"]

    @admin.display(description="Image")
    def image_preview(self, item):
        if not item.image:
            return ""
        return format_html('<img src="{}" style="height: 48px; width: auto;" />', item.image.url)
