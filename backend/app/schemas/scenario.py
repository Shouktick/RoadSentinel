"""Strict, documented STATS19 inputs. Speed is the posted limit in mph."""

from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.domain import CATEGORIES, FEATURES


class Scenario(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    speed_limit: int
    weather_conditions: int
    road_surface_conditions: int
    light_conditions: int
    road_type: int
    urban_or_rural_area: int
    hour: int
    day_of_week: int

    @model_validator(mode="after")
    def documented_categories(self):
        for name in FEATURES:
            if getattr(self, name) not in CATEGORIES[name]:
                raise ValueError(
                    f"{name}: choose a documented category; speed limits are 20-70 mph in steps of 10, or unknown (-1)"
                )
        return self


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario: Scenario
    save: bool = False
    explain: bool = True


class WhatIfRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    baseline: Scenario
    scenarios: list[Scenario] = Field(min_length=1, max_length=8)


class SweepRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario: Scenario
    start: int = Field(default=20, ge=20, le=70, multiple_of=10)
    stop: int = Field(default=70, ge=20, le=70, multiple_of=10)
    step: int = Field(default=10, ge=10, le=50, multiple_of=10)

    @model_validator(mode="after")
    def ordered(self):
        if self.stop < self.start:
            raise ValueError("stop must be greater than or equal to start")
        return self
