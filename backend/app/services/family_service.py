from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.services.base_service import BaseService
from app.repositories.family_repository import FamilyRepository
from app.schemas.family import FamiliarCreate, FamiliarResponse

class FamilyService(BaseService):
    """Servicio de gestión de la Red de Protección Familiar."""

    def __init__(self, db: Session):
        super().__init__(db)
        self.family_repo = FamilyRepository(db)

    def agregar_familiar(self, data: FamiliarCreate) -> Dict[str, Any]:
        nuevo = self.family_repo.add_member(
            usuario_responsable=data.usuario_responsable,
            nombre=data.nombre,
            parentesco=data.parentesco,
            dispositivo_id=data.dispositivo_id
        )
        return {
            "mensaje": f"Familiar {nuevo.nombre} vinculado correctamente a la red de protección.",
            "id": nuevo.id
        }

    def listar_familiares(self, usuario_responsable: str) -> List[FamiliarResponse]:
        familiares = self.family_repo.get_by_responsible(usuario_responsable)
        return [
            FamiliarResponse(
                id=f.id,
                usuario_responsable=f.usuario_responsable,
                nombre=f.nombre,
                parentesco=f.parentesco,
                dispositivo_id=f.dispositivo_id,
                creado_en=f.created_at
            ) for f in familiares
        ]
