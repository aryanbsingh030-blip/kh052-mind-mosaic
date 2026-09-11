"""
Schemas for Stage 10: Online/Offline Synchronization
Defines data structures for client operation queue, batch sync requests,
conflict resolution metadata, and server acknowledgements.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class SyncOperationType(str, Enum):
    CREATE_PROFILE = "CREATE_PROFILE"
    UPDATE_PROFILE = "UPDATE_PROFILE"
    UPDATE_SKILL = "UPDATE_SKILL"
    CREATE_PROJECT = "CREATE_PROJECT"
    ACCEPT_MATCH = "ACCEPT_MATCH"
    COMPLETE_SESSION = "COMPLETE_SESSION"
    CREDIT_TRANSACTION = "CREDIT_TRANSACTION"


class SyncOperationStatus(str, Enum):
    PENDING = "PENDING"
    SYNCING = "SYNCING"
    SUCCESS = "SUCCESS"
    CONFLICT_RESOLVED = "CONFLICT_RESOLVED"
    REJECTED = "REJECTED"
    ERROR = "ERROR"


class SyncOperationRequest(BaseModel):
    operation_id: str = Field(..., description="Unique client-generated UUID for the mutation")
    type: SyncOperationType = Field(..., description="Operation type")
    client_timestamp: datetime = Field(..., description="Client time when mutation occurred offline")
    entity_id: Optional[str] = Field(None, description="Primary ID of entity modified or created")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Mutation payload parameters")
    client_version: Optional[int] = Field(1, description="Client schema/mutation version")


class SyncOperationAck(BaseModel):
    operation_id: str = Field(..., description="Matching client operation UUID")
    type: SyncOperationType
    status: SyncOperationStatus
    server_timestamp: datetime = Field(..., description="Server processing time")
    message: str = Field(..., description="Human-readable outcome or conflict explanation")
    entity_id: Optional[str] = Field(None, description="Authoritative permanent server ID")
    authoritative_state: Optional[Dict[str, Any]] = Field(None, description="Current server state if conflict resolved or created")


class SyncBatchRequest(BaseModel):
    client_id: str = Field(..., description="Unique client installation identifier")
    operations: List[SyncOperationRequest] = Field(..., description="Batch of operations to synchronize")


class SyncBatchResponse(BaseModel):
    batch_id: str
    processed_count: int
    success_count: int
    conflict_count: int
    rejected_count: int
    error_count: int
    server_timestamp: datetime
    acknowledgements: List[SyncOperationAck]
    authoritative_balances: Optional[Dict[str, int]] = Field(default=None, description="Map of student_id -> authoritative credit_balance")


class SyncStatusResponse(BaseModel):
    status: str = "ONLINE"
    server_time: datetime
    version: str = "Stage 10: Sync Engine v1"
    supported_operations: List[str]
