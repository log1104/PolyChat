# Troubleshooting Notes

## Ghost Sidebar Strip in Web App

**Symptom**: A thin vertical strip appears on the far left of the chat UI (sometimes selectable as the text fragment "will appear here"). The burger icon seems missing or misaligned.

**Cause**: The mentor drawer component remained mounted while translated off-screen, so its 80px width (and copyable content) still affected layout.

**Fix**:

- In `apps/web/src/App.vue`, only render the drawer when it is open (`v-if="isDrawerOpen"`).
- Avoid hiding the drawer solely with CSS transforms; unmount it when closed.

After applying the fix, the strip disappears and the burger toggle behaves normally.
