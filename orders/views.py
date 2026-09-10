from decimal import Decimal, InvalidOperation

import json
import jdatetime

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import user_passes_test
from django.http import JsonResponse
from django.shortcuts import (
    get_object_or_404,
    render,
    redirect,
)
from django.utils import timezone
from django.views.decorators.http import require_POST

from orders.models import (
    Order,
    OrderItem,
    Invoice,
)

from orders.services import (
    create_order,
    update_order,
    delete_order as delete_order_service,
)