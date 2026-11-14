"""Exact forest decomposition is a deployment optimization, not an approximation."""

import numpy as np
import shap
from sklearn.ensemble import RandomForestClassifier

from app.services.model import BoundedForestExplainer


def test_bounded_explainer_matches_full_forest():
    # Synthetic fixture tests attribution equivalence only; it is never product data.
    rng = np.random.default_rng(42)
    features = rng.normal(size=(120, 7))
    target = np.arange(120) % 3
    forest = RandomForestClassifier(n_estimators=9, max_depth=5, random_state=42).fit(features, target)
    frame = features[:4]
    bounded = BoundedForestExplainer(forest)
    full = shap.TreeExplainer(forest, feature_perturbation="tree_path_dependent")
    assert np.allclose(bounded.shap_values(frame), full.shap_values(frame), atol=1e-10)
    assert np.allclose(bounded.expected_value, full.expected_value, atol=1e-10)
