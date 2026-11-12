import json
import time
from sqlalchemy import Column, Integer, String, Text, Float
from backend.database import Base


class InvestigationModel(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(String(64), unique=True, index=True)
    title = Column(String(255), nullable=False)
    blockchain = Column(String(32), default="bitcoin")  # "bitcoin" | "ethereum"
    input_type = Column(String(32), default="address")  # "address" | "txid"
    target = Column(String(255), nullable=False, index=True)
    hops = Column(Integer, default=4)
    status = Column(String(32), default="completed")  # "active" | "completed" | "archived"
    risk_score = Column(Integer, default=0)
    notes = Column(Text, default="")
    result_json = Column(Text, default="{}")
    created_at = Column(Integer, default=lambda: int(time.time()))
    updated_at = Column(Integer, default=lambda: int(time.time()))

    def to_dict(self, include_results: bool = True):
        data = {
            "id": self.id,
            "case_id": self.case_id,
            "title": self.title,
            "blockchain": self.blockchain,
            "input_type": self.input_type,
            "target": self.target,
            "hops": self.hops,
            "status": self.status,
            "risk_score": self.risk_score,
            "notes": self.notes,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if include_results:
            try:
                data["results"] = json.loads(self.result_json) if self.result_json else {}
            except Exception:
                data["results"] = {}
        return data
