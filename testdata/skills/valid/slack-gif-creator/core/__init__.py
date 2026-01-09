# Slack GIF Creator Core Modules
from .easing import interpolate, get_easing, EASING_FUNCTIONS
from .frame_composer import (
    create_blank_frame,
    create_gradient_background,
    draw_circle,
    draw_star,
    draw_text,
)
from .gif_builder import GIFBuilder
from .validators import validate_gif, is_slack_ready

__all__ = [
    "GIFBuilder",
    "validate_gif",
    "is_slack_ready",
    "interpolate",
    "get_easing",
    "EASING_FUNCTIONS",
    "create_blank_frame",
    "create_gradient_background",
    "draw_circle",
    "draw_star",
    "draw_text",
]
