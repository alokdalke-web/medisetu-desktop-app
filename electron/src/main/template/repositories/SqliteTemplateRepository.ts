import dbManager from '../../../../database/DatabaseManager';

export class SqliteTemplateRepository {
  public async getDoctorTemplate(doctorId: string): Promise<any> {
    const db = dbManager.getConnection();
    const query = `SELECT * FROM prescription_templates WHERE doctor_id = ? LIMIT 1`;
    const stmt = db.prepare(query);
    const result = stmt.get(doctorId) as any;
    
    if (!result) return null;
    
    return {
      templateName: result.template_name,
      fontFamily: result.font_family,
      color1: result.color1,
      color2: result.color2,
      color3: result.color3,
      color4: result.color4,
      color5: result.color5,
      color6: result.color6,
      color7: result.color7,
      color8: result.color8,
      color9: result.color9,
      color10: result.color10,
      fontSize: result.font_size,
      headerBgColor: result.header_bg_color,
      footerBgColor: result.footer_bg_color,
      textColor: result.text_color
    };
  }
}
