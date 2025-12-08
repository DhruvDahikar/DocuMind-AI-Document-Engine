from pydantic import BaseModel, Field
from typing import List

# This defines a single item inside the invoice (like "Widget A - $10")
class LineItem(BaseModel):
    description: str = Field(description="The name or description of the product/service")
    quantity: float = Field(description="The number of units bought")
    unit_price: float = Field(description="The price per unit")
    total_price: float = Field(description="The total price for this line item")

# This defines the whole invoice
class InvoiceSchema(BaseModel):
    invoice_number: str = Field(description="The unique identifier of the invoice")
    invoice_date: str = Field(description="The date of the invoice in YYYY-MM-DD format")
    vendor_name: str = Field(description="The name of the company issuing the invoice")
    total_amount: float = Field(description="The final total amount including tax")
    currency: str = Field(description="The currency code (e.g., USD, EUR, INR)")
    line_items: List[LineItem] = Field(description="List of all items purchased")