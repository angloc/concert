FROM python:3.13-bookworm
ENV DEDICATED_ENVIRONMENT=1
WORKDIR /workspace
COPY Makefile pyproject.toml uv.lock .python-version .node-version ./
COPY baseline/package.json baseline/package-lock.json baseline/
RUN make install
