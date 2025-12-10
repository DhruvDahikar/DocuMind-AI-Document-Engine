from pydantic import BaseModel, Field

class InvoiceSchema(BaseModel):
    """
    Structure for Invoice/Receipt Extraction
    """
    vendor_name: str = Field(description="Name of the vendor or supplier")
    invoice_number: str = Field(description="Invoice number or Receipt ID")
    invoice_date: str = Field(description="Date of the invoice/receipt (YYYY-MM-DD)")
    total_amount: float = Field(description="Grand total amount including tax")
    currency: str = Field(description="Currency code (USD, EUR, INR, etc)")
    tax_amount: float = Field(description="Total tax amount (0.00 if not found)")
    line_items: list[dict] = Field(description="List of items: [{'description': str, 'quantity': int, 'unit_price': float, 'total_price': float}]")

class ContractSchema(BaseModel):
    """
    Structure for Legal Contract Extraction
    """
    contract_type: str = Field(description="Type of contract (e.g., NDA, Employment, SaaS Agreement)")
    parties_involved: list[str] = Field(description="Names of companies or individuals signing")
    effective_date: str = Field(description="Date the agreement starts")
    key_terms: list[str] = Field(description="List of 3-5 critical terms or obligations")
    risk_analysis: str = Field(description="Brief analysis of risks/unusual clauses")
    overall_risk_level: str = Field(description="Risk level: 'Low', 'Medium', or 'High'")

class DocumentClassification(BaseModel):
    """
    Classifies the document type and confidence level.
    """
    document_type: str = Field(
        description="The type of document. Options: 'invoice', 'receipt', 'contract', 'other'"
    )
    confidence: float = Field(
        description="Confidence score between 0.0 and 1.0"
    )