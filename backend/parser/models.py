from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum


class ExtractionStatus(str, Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class ValidationStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


class ValidationLayer(BaseModel):
    layer: int
    name: str
    status: ValidationStatus
    confidence: float  # 0.0 - 1.0
    notes: str
    details: Optional[dict] = None


class EmployeeInfo(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    employee_id: Optional[str] = None
    ssn_last4: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None


class EmployerInfo(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    ein: Optional[str] = None
    phone: Optional[str] = None


class PayPeriod(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    pay_date: Optional[str] = None
    pay_frequency: Optional[str] = None  # weekly, bi-weekly, semi-monthly, monthly


class EarningsItem(BaseModel):
    description: Optional[str] = None
    hours: Optional[str] = None
    rate: Optional[str] = None
    current_amount: Optional[str] = None
    ytd_amount: Optional[str] = None


class DeductionItem(BaseModel):
    description: Optional[str] = None
    current_amount: Optional[str] = None
    ytd_amount: Optional[str] = None


class TaxItem(BaseModel):
    description: Optional[str] = None
    current_amount: Optional[str] = None
    ytd_amount: Optional[str] = None


class Totals(BaseModel):
    gross_pay_current: Optional[str] = None
    gross_pay_ytd: Optional[str] = None
    total_deductions_current: Optional[str] = None
    total_deductions_ytd: Optional[str] = None
    total_taxes_current: Optional[str] = None
    total_taxes_ytd: Optional[str] = None
    net_pay_current: Optional[str] = None
    net_pay_ytd: Optional[str] = None


class ExtractedData(BaseModel):
    employee: EmployeeInfo = EmployeeInfo()
    employer: EmployerInfo = EmployerInfo()
    pay_period: PayPeriod = PayPeriod()
    earnings: list[EarningsItem] = []
    deductions: list[DeductionItem] = []
    taxes: list[TaxItem] = []
    totals: Totals = Totals()
    check_number: Optional[str] = None
    raw_notes: Optional[str] = None
    extra_fields: Optional[dict[str, Any]] = None


class PaystubResult(BaseModel):
    status: ExtractionStatus
    overall_confidence: float  # 0.0 - 1.0
    extracted_data: ExtractedData
    validation_layers: list[ValidationLayer]
    warnings: list[str] = []
    errors: list[str] = []
    model_used: str
    processing_time_ms: Optional[int] = None
