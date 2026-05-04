from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from textwrap import dedent
from zipfile import ZipFile, ZIP_DEFLATED


OUT = Path(r"C:\Users\admin\Desktop\PCL\Application_Monitoring\output\ppt\AppPulse_Presentation.pptx")
OUT.parent.mkdir(parents=True, exist_ok=True)

PRES_CX = 12192000
PRES_CY = 6858000

NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


@dataclass
class SlideSpec:
    title: str
    bullets: list[str]
    placeholder_label: str
    left_title_only: bool = False


SLIDES = [
    SlideSpec(
        title="AppPulse",
        bullets=[
            "Application Monitoring & Observability System",
            "Flutter + Node.js + PostgreSQL + React",
            "Captures performance, errors, alerts, analytics, and traces",
        ],
        placeholder_label="Add project screenshot / dashboard hero image here",
        left_title_only=True,
    ),
    SlideSpec(
        title="Problem Statement + Objective",
        bullets=[
            "Applications can fail silently without proper monitoring.",
            "Slow APIs, errors, and crashes are difficult to investigate without visibility.",
            "Objective: build an end-to-end monitoring pipeline from event capture to dashboard insights.",
            "Goal: store structured logs, generate alerts automatically, and support trace-based debugging.",
        ],
        placeholder_label="Add screenshot showing project motivation or app + dashboard",
    ),
    SlideSpec(
        title="Architecture + Tech Stack",
        bullets=[
            "Flutter app generates API telemetry and user-side events.",
            "Node.js + Express backend validates payloads and processes monitoring data.",
            "PostgreSQL stores logs, errors, alerts, and trace-linked records.",
            "React dashboard visualizes Overview, Analytics, Logs, Traces, and Alerts.",
            "Socket.IO provides near real-time updates in addition to REST APIs.",
        ],
        placeholder_label="Add architecture diagram or full-system screenshot",
    ),
    SlideSpec(
        title="Core Features",
        bullets=[
            "API response time monitoring",
            "Structured log ingestion",
            "Error capture and storage",
            "Automatic alert generation",
            "Metrics aggregation and analytics",
            "Log filtering, CSV export, and Trace Explorer",
            "Alert resolution workflow and health check endpoint",
        ],
        placeholder_label="Add feature demo screenshot here",
    ),
    SlideSpec(
        title="Dashboard Pages",
        bullets=[
            "Overview: requests, avg response, error rate, active alerts, response-time chart",
            "Analytics: slow API analysis, error count by API, RCA-oriented recent errors",
            "Logs: searchable, filterable log table with CSV export",
            "Traces: recent trace list and per-trace timeline",
            "Alerts: active/resolved alerts, severity badges, resolve button",
        ],
        placeholder_label="Add dashboard page screenshots here",
    ),
    SlideSpec(
        title="Unique Strength of AppPulse",
        bullets=[
            "End-to-end observability pipeline from event generation to visualization",
            "Combines logs, metrics, alerts, analytics, and traces in one system",
            "Alert resolution is persisted in backend, not just frontend state",
            "Session context, device info, and trace IDs make debugging more practical",
            "More advanced than a simple CRUD dashboard project",
        ],
        placeholder_label="Add screenshot that best represents project strength",
    ),
    SlideSpec(
        title="Limitations + Future Enhancements",
        bullets=[
            "Current gaps: UI-only login, no automated tests, no verified migration files, no deployment setup",
            "Polling still exists alongside sockets and notification channels are not yet added",
            "Future work: JWT auth, schema migrations, Docker/cloud deployment, Slack/email alerts",
            "Planned innovation for next review: Smart Session Replay with Auto Bug Report Generation",
        ],
        placeholder_label="Add roadmap or next-phase screenshot here",
    ),
    SlideSpec(
        title="Conclusion",
        bullets=[
            "AppPulse demonstrates monitoring and observability in one academic project.",
            "It captures runtime events from Flutter, processes them in Node.js, stores them in PostgreSQL, and visualizes them in React.",
            "The project is functionally strong today and has clear scope for future innovation.",
        ],
        placeholder_label="Add final summary screenshot here",
    ),
]


def xml_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def paragraph_xml(text: str, size: int, bold: bool = False, color: str = "1F2937") -> str:
    weight = ' b="1"' if bold else ""
    return (
        f'<a:p>'
        f'<a:r><a:rPr lang="en-US" sz="{size}"{weight} dirty="0" smtClean="0">'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
        f'</a:rPr><a:t>{xml_escape(text)}</a:t></a:r>'
        f'<a:endParaRPr lang="en-US" sz="{size}"/></a:p>'
    )


def textbox(shape_id: int, name: str, x: int, y: int, cx: int, cy: int, paragraphs: list[str]) -> str:
    para_xml = "".join(paragraphs)
    return dedent(
        f"""
        <p:sp>
          <p:nvSpPr>
            <p:cNvPr id="{shape_id}" name="{xml_escape(name)}"/>
            <p:cNvSpPr txBox="1"/>
            <p:nvPr/>
          </p:nvSpPr>
          <p:spPr>
            <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            <a:noFill/>
            <a:ln><a:noFill/></a:ln>
          </p:spPr>
          <p:txBody>
            <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"/>
            <a:lstStyle/>
            {para_xml}
          </p:txBody>
        </p:sp>
        """
    ).strip()


def placeholder_box(shape_id: int, x: int, y: int, cx: int, cy: int, label: str) -> str:
    return dedent(
        f"""
        <p:sp>
          <p:nvSpPr>
            <p:cNvPr id="{shape_id}" name="Screenshot Placeholder"/>
            <p:cNvSpPr/>
            <p:nvPr/>
          </p:nvSpPr>
          <p:spPr>
            <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            <a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill>
            <a:ln w="19050">
              <a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill>
            </a:ln>
          </p:spPr>
          <p:txBody>
            <a:bodyPr wrap="square" anchor="ctr"/>
            <a:lstStyle/>
            {paragraph_xml(label, 1800, bold=True, color="64748B")}
            {paragraph_xml("Replace this box with your screenshot", 1400, color="94A3B8")}
          </p:txBody>
        </p:sp>
        """
    ).strip()


def accent_bar(shape_id: int, x: int, y: int, cx: int, cy: int, color: str = "2563EB") -> str:
    return dedent(
        f"""
        <p:sp>
          <p:nvSpPr>
            <p:cNvPr id="{shape_id}" name="Accent Bar"/>
            <p:cNvSpPr/>
            <p:nvPr/>
          </p:nvSpPr>
          <p:spPr>
            <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            <a:solidFill><a:srgbClr val="{color}"/></a:solidFill>
            <a:ln><a:noFill/></a:ln>
          </p:spPr>
          <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
        </p:sp>
        """
    ).strip()


def slide_xml(spec: SlideSpec) -> str:
    shapes: list[str] = []
    shapes.append(
        '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>'
        '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
    )
    shapes.append(accent_bar(2, 0, 0, PRES_CX, 260000))

    if spec.left_title_only:
        shapes.append(
            textbox(
                3,
                "Title Box",
                700000,
                700000,
                4300000,
                1100000,
                [paragraph_xml(spec.title, 2800, bold=True, color="0F172A")],
            )
        )
        shapes.append(
            textbox(
                4,
                "Subtitle Box",
                700000,
                1800000,
                4300000,
                1500000,
                [paragraph_xml(line, 1800, color="334155") for line in spec.bullets],
            )
        )
        shapes.append(placeholder_box(5, 5900000, 900000, 5200000, 3600000, spec.placeholder_label))
    else:
        shapes.append(
            textbox(
                3,
                "Title Box",
                700000,
                420000,
                5200000,
                700000,
                [paragraph_xml(spec.title, 2400, bold=True, color="0F172A")],
            )
        )
        bullet_paras = [paragraph_xml(f"• {line}", 1600, color="334155") for line in spec.bullets]
        shapes.append(
            textbox(
                4,
                "Body Box",
                700000,
                1250000,
                5200000,
                4200000,
                bullet_paras,
            )
        )
        shapes.append(placeholder_box(5, 6700000, 1200000, 4300000, 3600000, spec.placeholder_label))

    return dedent(
        f"""
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:sld xmlns:a="{NS_A}" xmlns:r="{NS_R}" xmlns:p="{NS_P}">
          <p:cSld>
            <p:spTree>
              {''.join(shapes)}
            </p:spTree>
          </p:cSld>
          <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
        </p:sld>
        """
    ).strip()


def slide_rels_xml() -> str:
    return dedent(
        f"""
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
        </Relationships>
        """
    ).strip()


def presentation_xml(num_slides: int) -> str:
    sld_ids = []
    for i in range(1, num_slides + 1):
        sld_ids.append(f'<p:sldId id="{255 + i}" r:id="rId{i + 1}"/>')
    return dedent(
        f"""
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:presentation xmlns:a="{NS_A}" xmlns:r="{NS_R}" xmlns:p="{NS_P}">
          <p:sldMasterIdLst>
            <p:sldMasterId id="2147483648" r:id="rId1"/>
          </p:sldMasterIdLst>
          <p:sldIdLst>
            {''.join(sld_ids)}
          </p:sldIdLst>
          <p:sldSz cx="{PRES_CX}" cy="{PRES_CY}"/>
          <p:notesSz cx="6858000" cy="9144000"/>
          <p:defaultTextStyle/>
        </p:presentation>
        """
    ).strip()


def presentation_rels_xml(num_slides: int) -> str:
    rels = [
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    ]
    for i in range(1, num_slides + 1):
        rels.append(
            f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>'
        )
    return dedent(
        f"""
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          {''.join(rels)}
        </Relationships>
        """
    ).strip()


SLIDE_MASTER_XML = dedent(
    f"""
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sldMaster xmlns:a="{NS_A}" xmlns:r="{NS_R}" xmlns:p="{NS_P}">
      <p:cSld name="Office Theme">
        <p:spTree>
          <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
          <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
        </p:spTree>
      </p:cSld>
      <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
      <p:sldLayoutIdLst>
        <p:sldLayoutId id="1" r:id="rId1"/>
      </p:sldLayoutIdLst>
      <p:txStyles>
        <p:titleStyle/><p:bodyStyle/><p:otherStyle/>
      </p:txStyles>
    </p:sldMaster>
    """
).strip()


SLIDE_MASTER_RELS_XML = dedent(
    """
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
    </Relationships>
    """
).strip()


SLIDE_LAYOUT_XML = dedent(
    f"""
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sldLayout xmlns:a="{NS_A}" xmlns:r="{NS_R}" xmlns:p="{NS_P}" type="blank" preserve="1">
      <p:cSld name="Blank">
        <p:spTree>
          <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
          <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
        </p:spTree>
      </p:cSld>
      <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
    </p:sldLayout>
    """
).strip()


SLIDE_LAYOUT_RELS_XML = dedent(
    """
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
    </Relationships>
    """
).strip()


THEME_XML = dedent(
    f"""
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <a:theme xmlns:a="{NS_A}" name="AppPulse Theme">
      <a:themeElements>
        <a:clrScheme name="AppPulse Colors">
          <a:dk1><a:srgbClr val="0F172A"/></a:dk1>
          <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
          <a:dk2><a:srgbClr val="1E293B"/></a:dk2>
          <a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
          <a:accent1><a:srgbClr val="2563EB"/></a:accent1>
          <a:accent2><a:srgbClr val="0F766E"/></a:accent2>
          <a:accent3><a:srgbClr val="D97706"/></a:accent3>
          <a:accent4><a:srgbClr val="DC2626"/></a:accent4>
          <a:accent5><a:srgbClr val="7C3AED"/></a:accent5>
          <a:accent6><a:srgbClr val="475569"/></a:accent6>
          <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
          <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
        </a:clrScheme>
        <a:fontScheme name="AppPulse Fonts">
          <a:majorFont>
            <a:latin typeface="Aptos Display"/>
            <a:ea typeface=""/>
            <a:cs typeface=""/>
          </a:majorFont>
          <a:minorFont>
            <a:latin typeface="Aptos"/>
            <a:ea typeface=""/>
            <a:cs typeface=""/>
          </a:minorFont>
        </a:fontScheme>
        <a:fmtScheme name="AppPulse Format">
          <a:fillStyleLst>
            <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
            <a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill>
            <a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill>
          </a:fillStyleLst>
          <a:lnStyleLst>
            <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
            <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
            <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
          </a:lnStyleLst>
          <a:effectStyleLst>
            <a:effectStyle><a:effectLst/></a:effectStyle>
            <a:effectStyle><a:effectLst/></a:effectStyle>
            <a:effectStyle><a:effectLst/></a:effectStyle>
          </a:effectStyleLst>
          <a:bgFillStyleLst>
            <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
            <a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill>
            <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          </a:bgFillStyleLst>
        </a:fmtScheme>
      </a:themeElements>
      <a:objectDefaults/>
      <a:extraClrSchemeLst/>
    </a:theme>
    """
).strip()


CONTENT_TYPES_XML = dedent(
    """
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
      <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
      <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
      <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
      <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
      <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
    """
).strip()


ROOT_RELS_XML = dedent(
    """
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
      <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
    </Relationships>
    """
).strip()


APP_XML = dedent(
    """
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
                xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
      <Application>OpenAI Codex</Application>
      <PresentationFormat>Widescreen</PresentationFormat>
      <Slides>8</Slides>
      <Notes>0</Notes>
      <HiddenSlides>0</HiddenSlides>
      <MMClips>0</MMClips>
      <ScaleCrop>false</ScaleCrop>
      <HeadingPairs>
        <vt:vector size="2" baseType="variant">
          <vt:variant><vt:lpstr>Slides</vt:lpstr></vt:variant>
          <vt:variant><vt:i4>8</vt:i4></vt:variant>
        </vt:vector>
      </HeadingPairs>
      <TitlesOfParts>
        <vt:vector size="8" baseType="lpstr">
          <vt:lpstr>AppPulse</vt:lpstr>
          <vt:lpstr>Problem Statement + Objective</vt:lpstr>
          <vt:lpstr>Architecture + Tech Stack</vt:lpstr>
          <vt:lpstr>Core Features</vt:lpstr>
          <vt:lpstr>Dashboard Pages</vt:lpstr>
          <vt:lpstr>Unique Strength of AppPulse</vt:lpstr>
          <vt:lpstr>Limitations + Future Enhancements</vt:lpstr>
          <vt:lpstr>Conclusion</vt:lpstr>
        </vt:vector>
      </TitlesOfParts>
      <Company></Company>
      <LinksUpToDate>false</LinksUpToDate>
      <SharedDoc>false</SharedDoc>
      <HyperlinksChanged>false</HyperlinksChanged>
      <AppVersion>16.0000</AppVersion>
    </Properties>
    """
).strip()


def core_xml() -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return dedent(
        f"""
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                           xmlns:dc="http://purl.org/dc/elements/1.1/"
                           xmlns:dcterms="http://purl.org/dc/terms/"
                           xmlns:dcmitype="http://purl.org/dc/dcmitype/"
                           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <dc:title>AppPulse Presentation</dc:title>
          <dc:creator>OpenAI Codex</dc:creator>
          <cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
          <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
          <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
        </cp:coreProperties>
        """
    ).strip()


def build_pptx() -> None:
    content_types = [CONTENT_TYPES_XML]
    for i in range(1, len(SLIDES) + 1):
        content_types.append(
            f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        )
    content_types.append("</Types>")

    with ZipFile(OUT, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "".join(content_types))
        zf.writestr("_rels/.rels", ROOT_RELS_XML)
        zf.writestr("docProps/app.xml", APP_XML)
        zf.writestr("docProps/core.xml", core_xml())
        zf.writestr("ppt/presentation.xml", presentation_xml(len(SLIDES)))
        zf.writestr("ppt/_rels/presentation.xml.rels", presentation_rels_xml(len(SLIDES)))
        zf.writestr("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER_XML)
        zf.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", SLIDE_MASTER_RELS_XML)
        zf.writestr("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT_XML)
        zf.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", SLIDE_LAYOUT_RELS_XML)
        zf.writestr("ppt/theme/theme1.xml", THEME_XML)

        for idx, spec in enumerate(SLIDES, start=1):
            zf.writestr(f"ppt/slides/slide{idx}.xml", slide_xml(spec))
            zf.writestr(f"ppt/slides/_rels/slide{idx}.xml.rels", slide_rels_xml())


if __name__ == "__main__":
    build_pptx()
    print(OUT)
