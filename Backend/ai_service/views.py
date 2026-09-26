from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .predictor import predict_health_problem
from .inventory_lookup import find_available_medicines


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_query(request):
    text = request.data.get("text", "")

    if not str(text).strip():
        return Response(
            {"detail": "Query text is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = predict_health_problem(text)

        result["inventory_matches"] = (
            find_available_medicines(
                result.get("candidate_generics", [])
            )
        )

        return Response(result)

    except ValueError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
