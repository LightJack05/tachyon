.PHONY: restart

restart:
	podman compose down
	podman compose build --no-cache
	podman compose up -d
