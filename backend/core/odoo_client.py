import base64
import json
from typing import Any
import httpx
from .config import settings

ODOO_PROJECT_IT_SERVICE = 72
_MCP_URL = None
_MCP_HEADERS = None


def _get_mcp_config():
    global _MCP_URL, _MCP_HEADERS
    if _MCP_URL is None:
        if not settings.odoo_user or not settings.odoo_api_key:
            raise RuntimeError("ODOO_USER and ODOO_API_KEY must be set in environment")
        token = base64.b64encode(
            f"{settings.odoo_user}:{settings.odoo_api_key}".encode()
        ).decode()
        _MCP_URL = f"{settings.odoo_url}/mcp/"
        _MCP_HEADERS = {
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    return _MCP_URL, _MCP_HEADERS


def _mcp_call(tool_name: str, arguments: dict) -> Any:
    url, headers = _get_mcp_config()
    response = httpx.post(
        url,
        headers=headers,
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/call",
              "params": {"name": tool_name, "arguments": arguments}},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    result = data.get("result", {})
    if result.get("isError"):
        raise RuntimeError(f"Odoo MCP error: {result}")
    text = result["content"][0]["text"]
    return json.loads(text)


def list_tasks(project_id: int = ODOO_PROJECT_IT_SERVICE, limit: int = 20) -> list:
    return _mcp_call("odoo_search", {
        "model": "project.task",
        "domain": [["project_id", "=", project_id]],
        "fields": ["id", "name", "stage_id", "date_deadline"],
        "limit": limit,
    })


def create_task(name: str, project_id: int = ODOO_PROJECT_IT_SERVICE) -> dict:
    result = _mcp_call("odoo_create", {
        "model": "project.task",
        "values": {"name": name, "project_id": project_id},
    })
    task_id = result.get("created_id") if isinstance(result, dict) else result
    return {"id": task_id, "name": name, "stage_id": None, "date_deadline": None}
