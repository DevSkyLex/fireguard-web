FROM docker:28.2.2-cli

RUN apk add --no-cache python3 py3-pip openssh-client
COPY ansible/requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/ansible && /opt/ansible/bin/pip install --no-cache-dir -r /tmp/requirements.txt
ENV PATH="/opt/ansible/bin:${PATH}"
COPY ansible/requirements.yml /tmp/requirements.yml
RUN ansible-galaxy collection install -r /tmp/requirements.yml
WORKDIR /workspace
ENTRYPOINT []
