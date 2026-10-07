from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FamiliarCreate(BaseModel):
    usuario_responsable: str = Field(..., min_length=1)
    nombre: str = Field(..., min_length=2, max_length=150)
    parentesco: str = Field(..., min_length=2, max_length=80)
    dispositivo_id: Optional[str] = Field(default="DEV-DEFAULT")

class FamiliarResponse(BaseModel):
    id: int
    usuario_responsable: str
    nombre: str
    parentesco: str
    dispositivo_id: Optional[str] = None
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True
