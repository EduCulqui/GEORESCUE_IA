from types import SimpleNamespace
from unittest.mock import patch

from app.schemas.coaccion import RoboCoaccionCreate
from app.services.coaccion import despachar_robo_coaccion


@patch("app.services.coaccion_service.FamilyRepository")
@patch("app.services.coaccion_service.AlertRepository")
def test_despachar_robo_coaccion_prioriza_pnp(mock_alert_repo, mock_family_repo):
    # El servicio ya no usa funciones sueltas de crud: trabaja con repositorios.
    mock_alert_repo.return_value.create_spatial_alert.return_value = SimpleNamespace(id=77)
    mock_family_repo.return_value.get_by_responsible.return_value = [SimpleNamespace(nombre="María")]

    payload = RoboCoaccionCreate(
        dispositivo_id="DEV_999",
        usuario="DEV_999",
        tipo_amenaza="coaccion",
        descripcion="Se me amenazó con armas y pidieron el celular",
        latitud=-7.1601,
        longitud=-78.5102,
        amenaza_detectada=True,
        activar_panic_silencioso=True,
    )

    response = despachar_robo_coaccion(object(), payload)

    assert response.alerta_id == 77
    assert response.tipo_emergencia == "ROBO_ASALTO_COACCION"
    assert response.institucion_prioritaria == "Policía Nacional del Perú (PNP)"
    assert response.coordenadas == {"lat": -7.1601, "lng": -78.5102}
    assert response.alerta_silenciosa is True
    assert response.notificacion_familiar["familiares_alertados"] == ["María"]

    _, kwargs = mock_alert_repo.return_value.create_spatial_alert.call_args
    assert kwargs["tipo_emergencia"] == "ROBO_ASALTO_COACCION"
    assert kwargs["origen_alerta"] == "PANIC_SILENCIOSO"
    mock_family_repo.return_value.get_by_responsible.assert_called_once_with("DEV_999")
