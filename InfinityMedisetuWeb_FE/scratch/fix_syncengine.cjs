const fs = require('fs');
const file = 'e:/medisetu-desktop/InfinityMedisetuWeb_FE/electron/src/main/sync/SyncEngine.ts';
let content = fs.readFileSync(file, 'utf8');

// The corrupted block
const target = `            } catch (e) {
              logger.error('SyncEngine: Failed to map medicine cloud_id in prescriptions', e);
            }
          }\`);
              }
            } catch (e) {
              logger.error('SyncEngine: Failed to map patient cloud_id', e);
            }
          }`;

const replacement = `            } catch (e) {
              logger.error('SyncEngine: Failed to map medicine cloud_id in prescriptions', e);
            }
          }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log('Fixed SyncEngine successfully');
} else {
  console.log('Could not find exact target string');
}
