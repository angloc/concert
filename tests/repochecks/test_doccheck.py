"""The documentation check, through its public interface: each rule with a valid and an invalid repository."""

import os
import subprocess

import pytest

KB = "docs/knowledge"


def rules(violations):
    return {v.rule for v in violations}


def test_valid_repository_passes(files, run):
    assert run(files) == []


# Rule 1: frontmatter


@pytest.mark.parametrize(
    "text",
    [
        "# No frontmatter\n",
        "---\ntype: x\ntitle: [unclosed\n---\n",
        "---\n- a list\n---\n",
        "---\ntype: x\ntitle: T\n---\n",
        "---\ntype: ''\ntitle: T\ndescription: D\n---\n",
        "---\ntype: x\ntitle: T\ndescription: |\n  two\n  lines\n---\n",
        "---\ntype: x\ntitle: T\ndescription: D\ntags: notalist\n---\n",
        "---\ntype: x\ntitle: T\ndescription: D\ntags: [1, 2]\n---\n",
        "---\ntype: x\ntitle: T\ndescription: D\ntimestamp: 2026-01-01\n---\n",
        "---\ntype: x\ntitle: T\ndescription: D\n",
    ],
)
def test_rule1_bad_concept_frontmatter(files, run, text):
    files[f"{KB}/tech-stack.md"] = text
    assert 1 in rules(run(files))


def test_rule1_subindex_with_frontmatter(files, run):
    files[f"{KB}/topic/index.md"] = (
        "---\ntitle: T\n---\n" + files[f"{KB}/topic/index.md"]
    )
    assert 1 in rules(run(files))


@pytest.mark.parametrize(
    "front",
    [
        "",
        "---\nokf_version: '0.1'\n---\n",
        "---\nokf_version: 0.2\n---\n",
        '---\nokf_version: "0.2"\ntitle: x\n---\n',
    ],
)
def test_rule1_root_index_frontmatter(files, run, front):
    body = files[f"{KB}/index.md"].split("---\n", 2)[2]
    files[f"{KB}/index.md"] = front + body
    assert 1 in rules(run(files))


def test_rule1_log_file(files, run):
    files[f"{KB}/topic/log.md"] = "log\n"
    assert 1 in rules(run(files))


# Rule 2: indexes


def test_rule2_concept_not_listed(files, run):
    files[f"{KB}/extra.md"] = "---\ntype: x\ntitle: Extra\ndescription: D\n---\n"
    assert 2 in rules(run(files))


def test_rule2_subdirectory_not_listed(files, run):
    files[f"{KB}/index.md"] = files[f"{KB}/index.md"].replace(
        "* [Topic](topic/index.md) - grouped concepts\n", ""
    )
    assert 2 in rules(run(files))


def test_rule2_entry_does_not_resolve(files, run):
    files[f"{KB}/topic/index.md"] += "* [Gone](gone.md) - missing\n"
    assert 2 in rules(run(files))


def test_rule2_entry_in_wrong_form(files, run):
    files[f"{KB}/topic/index.md"] = "# Topic\n\n- [Glossary](glossary.md): terms\n"
    assert 2 in rules(run(files))


def test_rule2_directory_without_index(files, run):
    del files[f"{KB}/topic/index.md"]
    assert 2 in rules(run(files))


# Rule 3: links


@pytest.mark.parametrize(
    "name",
    [
        f"{KB}/architecture.md",
        "docs/decisions/0002-second.md",
        "AGENTS.md",
        "PROJECT_PLAN.md",
        "README.md",
        "docs/user/README.md",
    ],
)
def test_rule3_broken_link(files, run, name):
    files[name] = (
        files.get(name, "# User guide\n") + "\nSee [missing](no/such/file.md).\n"
    )
    assert 3 in rules(run(files))


def test_rule3_broken_fragment(files, run):
    files["AGENTS.md"] += "\nSee [policy](POLICY.md#no-such-heading).\n"
    assert 3 in rules(run(files))


def test_rule3_fragment_in_same_file(files, run):
    files["AGENTS.md"] += (
        "\n## Mandates\n\nSee [above](#mandates) and [nowhere](#nowhere).\n"
    )
    found = [v for v in run(files) if v.rule == 3]
    assert len(found) == 1 and "#nowhere" in found[0].message


def test_rule3_duplicate_heading_anchors(files, run):
    files["AGENTS.md"] += "\n## Notes\n\n## Notes\n\nSee [second](#notes-1).\n"
    assert run(files) == []


def test_rule3_skill_documents_checked(files, run):
    files["skills/operate/SKILL.md"] = "# Operate\n\n[gone](missing.md)\n"
    assert 3 in rules(run(files))


def test_rule3_wip_is_skipped(files, run):
    assert files["wip/scratch.md"]
    assert run(files) == []


# Rule 4: size caps


def test_rule4_knowledge_file_too_large(files, run):
    files[f"{KB}/tech-stack.md"] += "x" * 20481
    assert 4 in rules(run(files))


def test_rule4_agents_too_large(files, run):
    files["AGENTS.md"] += "x" * 12289
    assert 4 in rules(run(files))


# Rule 5: plan


@pytest.mark.parametrize(
    "field", ["Benefit:", "Deliver:", "Docs:", "Publishes:", "Acceptance:"]
)
def test_rule5_missing_field(files, run, field):
    plan = files["PROJECT_PLAN.md"].split("## I2")
    plan[0] = "\n".join(
        line for line in plan[0].split("\n") if not line.startswith(field)
    )
    files["PROJECT_PLAN.md"] = "## I2".join(plan)
    assert 5 in rules(run(files))


def test_rule5_read_first_without_link(files, run):
    files["PROJECT_PLAN.md"] = files["PROJECT_PLAN.md"].replace(
        "Read first: [tech stack](docs/knowledge/tech-stack.md)",
        "Read first: the tech stack",
    )
    assert 5 in rules(run(files))


@pytest.mark.parametrize(
    "docs", ["Docs: update README.md", "Docs: change docs/installer/README.md", "Docs:"]
)
def test_rule5_bad_docs_entry(files, run, docs):
    files["PROJECT_PLAN.md"] = files["PROJECT_PLAN.md"].replace(
        "Docs: change docs/user/README.md, change README.md", docs
    )
    assert 5 in rules(run(files))


def test_rule5_change_before_add(files, run):
    plan = files["PROJECT_PLAN.md"]
    plan = plan.replace("Docs: add docs/user/README.md", "Docs: TMP").replace(
        "Docs: change docs/user/README.md, change README.md",
        "Docs: add docs/user/README.md",
    )
    files["PROJECT_PLAN.md"] = plan.replace(
        "Docs: TMP", "Docs: change docs/user/README.md"
    )
    assert 5 in rules(run(files))


def test_rule5_missing_plan(files, run):
    del files["PROJECT_PLAN.md"]
    files["README.md"] = "# Demo\n"
    assert 5 in rules(run(files))


# Rule 6: years in headings


def test_rule6_year_in_heading(files, run):
    files[f"{KB}/topic/glossary.md"] += "\n## Changes in 2026\n"
    assert 6 in rules(run(files))


def test_rule6_year_outside_headings_is_allowed(files, run):
    files[f"{KB}/topic/glossary.md"] += "\nDecided in 2026.\n"
    assert run(files) == []


# Rule 7: decision records


def test_rule7_bad_file_name(files, run):
    files["docs/decisions/3-third.md"] = files["docs/decisions/0002-second.md"]
    assert 7 in rules(run(files))


def test_rule7_duplicate_number(files, run):
    files["docs/decisions/0002-again.md"] = files["docs/decisions/0002-second.md"]
    assert 7 in rules(run(files))


def test_rule7_missing_section(files, run):
    files["docs/decisions/0002-second.md"] = files[
        "docs/decisions/0002-second.md"
    ].replace("## Consequences", "## Results")
    assert 7 in rules(run(files))


@pytest.mark.parametrize("status", ["Approved", "Superseded by 0009", ""])
def test_rule7_bad_status(files, run, status):
    files["docs/decisions/0001-first.md"] = files[
        "docs/decisions/0001-first.md"
    ].replace("Superseded by 0002", status)
    assert 7 in rules(run(files))


# Rule 8: required concepts


@pytest.mark.parametrize("concept", ["architecture", "tech-stack", "open-questions"])
def test_rule8_missing_concept(files, run, concept):
    del files[f"{KB}/{concept}.md"]
    assert 8 in rules(run(files))


def test_rule8_concept_as_topic_directory(files, run):
    files[f"{KB}/tech-stack/index.md"] = (
        "# Tech stack\n\n* [Runtime](runtime.md) - the runtime\n"
    )
    files[f"{KB}/tech-stack/runtime.md"] = (
        "---\ntype: reference\ntitle: Runtime\ndescription: D\n---\n"
    )
    del files[f"{KB}/tech-stack.md"]
    files[f"{KB}/index.md"] = files[f"{KB}/index.md"].replace(
        "(tech-stack.md)", "(tech-stack/index.md)"
    )
    files["PROJECT_PLAN.md"] = files["PROJECT_PLAN.md"].replace(
        "docs/knowledge/tech-stack.md", "docs/knowledge/tech-stack/index.md"
    )
    assert run(files) == []


def test_rule8_platforms_needed_when_dist_has_files(files, run):
    del files[f"{KB}/platforms.md"]
    files[f"{KB}/index.md"] = files[f"{KB}/index.md"].replace(
        "* [Platforms](platforms.md) - the files\n", ""
    )
    assert 8 in rules(run(files))


# Rule 9: dist matches platforms


def test_rule9_unlisted_file_in_dist(files, run):
    files["dist/extra.zip"] = "zip"
    assert 9 in rules(run(files))


def test_rule9_listed_file_missing(files, run):
    del files["dist/demo_1.2.3.html"]
    assert 9 in rules(run(files))


def test_rule9_wrong_version(files, run):
    assert 9 in rules(run(files, version="9.9.9"))


def test_rule9_missing_checksums(files, run):
    del files["dist/SHA256SUMS"]
    assert 9 in rules(run(files))


def test_rule9_files_without_platforms(files, run):
    files[f"{KB}/platforms.md"] = None
    del files[f"{KB}/platforms.md"]
    files[f"{KB}/index.md"] = files[f"{KB}/index.md"].replace(
        "* [Platforms](platforms.md) - the files\n", ""
    )
    assert 9 in rules(run(files))


def test_rule9_empty_dist_without_platforms(files, run):
    for name in [n for n in files if n.startswith("dist/")]:
        del files[name]
    del files[f"{KB}/platforms.md"]
    files[f"{KB}/index.md"] = files[f"{KB}/index.md"].replace(
        "* [Platforms](platforms.md) - the files\n", ""
    )
    assert run(files) == []


# Rule 10: policy hashes


def test_rule10_edited_policy(files, run):
    files["POLICY.md"] += "local edit\n"
    assert 10 in rules(run(files))


def test_rule10_unrecorded_policy_file(files, run):
    files["policy/release.md"] = "# Release\n"
    assert 10 in rules(run(files))


def test_rule10_recorded_file_missing(files, run):
    del files["policy/python.md"]
    files["AGENTS.md"] = "# Agent rules\n"
    assert 10 in rules(run(files))


# Command line


def _cli(root, *extra):
    env = dict(os.environ, VERSION_TAG="v1.2.3")
    return subprocess.run(
        ["doccheck", str(root), str(root / "dist"), *extra],
        check=False,
        capture_output=True,
        text=True,
        env=env,
    )


def test_cli_valid_repository(files, written):
    root = written(files)
    result = _cli(root)
    assert result.returncode == 0, result.stdout + result.stderr


def test_cli_names_the_rule(files, written):
    files["POLICY.md"] += "edit\n"
    root = written(files)
    result = _cli(root)
    assert result.returncode == 1
    assert "rule 10" in result.stdout


def test_cli_explicit_version(files, written):
    root = written(files)
    assert _cli(root, "--version", "9.9.9").returncode == 1


def test_cli_usage_error():
    result = subprocess.run(["doccheck"], check=False, capture_output=True, text=True)
    assert result.returncode == 2
